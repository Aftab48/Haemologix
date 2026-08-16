"""Model backends behind one small interface.

    Predictor.fit(X, y, X_val, y_val) -> self
    Predictor.predict(X) -> np.ndarray   # binary: P(1) [n]; regression: value in *model space* [n];
                                        # multiclass: probs [n, k]
    Predictor.save(dir) / Predictor.load(dir)
    Predictor.feature_importance(names) -> dict | None

Backends:
  * MlpPredictor   – small PyTorch MLP per task (the "custom model" the user asked for)
  * GbdtPredictor  – scikit-learn HistGradientBoosting (strong tabular baseline that MLP must beat, or ship it)
  * RulesPredictor – what the deterministic agents effectively assume today (constant rate / rule ETA);
                     the floor every learned model must clear to be approvable
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import torch
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from torch import nn

from .tasks import TaskSpec

BACKENDS = ["mlp", "gbdt", "rules"]


class Predictor:
    backend: str = "base"

    def __init__(self, spec: TaskSpec):
        self.spec = spec

    def fit(self, X: np.ndarray, y: np.ndarray, X_val: np.ndarray | None = None, y_val: np.ndarray | None = None) -> "Predictor":
        raise NotImplementedError

    def predict(self, X: np.ndarray) -> np.ndarray:
        raise NotImplementedError

    def save(self, d: Path) -> None:
        raise NotImplementedError

    @classmethod
    def load(cls, d: Path, spec: TaskSpec) -> "Predictor":
        raise NotImplementedError

    def feature_importance(self, names: list[str]) -> dict[str, float] | None:
        return None


# ---------------------------------------------------------------------------
# PyTorch MLP
# ---------------------------------------------------------------------------

class _Mlp(nn.Module):
    def __init__(self, in_dim: int, out_dim: int, hidden: tuple[int, ...] = (128, 64), dropout: float = 0.1):
        super().__init__()
        layers: list[nn.Module] = []
        d = in_dim
        for h in hidden:
            layers += [nn.Linear(d, h), nn.LayerNorm(h), nn.GELU(), nn.Dropout(dropout)]
            d = h
        layers.append(nn.Linear(d, out_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class MlpPredictor(Predictor):
    backend = "mlp"

    def __init__(
        self,
        spec: TaskSpec,
        hidden: tuple[int, ...] = (128, 64),
        dropout: float = 0.1,
        lr: float = 2e-3,
        weight_decay: float = 1e-4,
        epochs: int = 60,
        batch_size: int = 512,
        patience: int = 8,
        seed: int = 7,
        device: str | None = None,
    ):
        super().__init__(spec)
        self.hidden = tuple(hidden)
        self.dropout = dropout
        self.lr = lr
        self.weight_decay = weight_decay
        self.epochs = epochs
        self.batch_size = batch_size
        self.patience = patience
        self.seed = seed
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model: _Mlp | None = None
        self.in_dim = 0
        self.temperature = 1.0  # post-hoc calibration for binary/multiclass
        self.history: list[dict[str, float]] = []

    @property
    def out_dim(self) -> int:
        return self.spec.num_classes if self.spec.kind == "multiclass" else 1

    def _loss(self, logits: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        if self.spec.kind == "binary":
            return nn.functional.binary_cross_entropy_with_logits(logits.squeeze(-1), y)
        if self.spec.kind == "regression":
            return nn.functional.smooth_l1_loss(logits.squeeze(-1), y)
        return nn.functional.cross_entropy(logits, y.long())

    def fit(self, X, y, X_val=None, y_val=None):
        torch.manual_seed(self.seed)
        np.random.seed(self.seed)
        self.in_dim = X.shape[1]
        self.model = _Mlp(self.in_dim, self.out_dim, self.hidden, self.dropout).to(self.device)
        opt = torch.optim.AdamW(self.model.parameters(), lr=self.lr, weight_decay=self.weight_decay)
        sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(1, self.epochs))
        Xt = torch.as_tensor(X, dtype=torch.float32, device=self.device)
        yt = torch.as_tensor(y, dtype=torch.float32 if self.spec.kind != "multiclass" else torch.long, device=self.device)
        has_val = X_val is not None and len(X_val) > 0
        if has_val:
            Xv = torch.as_tensor(X_val, dtype=torch.float32, device=self.device)
            yv = torch.as_tensor(y_val, dtype=torch.float32 if self.spec.kind != "multiclass" else torch.long, device=self.device)
        best = math.inf
        best_state = None
        bad = 0
        n = len(Xt)
        for epoch in range(self.epochs):
            self.model.train()
            perm = torch.randperm(n, device=self.device)
            total = 0.0
            for i in range(0, n, self.batch_size):
                idx = perm[i:i + self.batch_size]
                opt.zero_grad(set_to_none=True)
                loss = self._loss(self.model(Xt[idx]), yt[idx])
                loss.backward()
                nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                opt.step()
                total += float(loss) * len(idx)
            sched.step()
            rec = {"epoch": epoch, "train_loss": total / max(1, n)}
            if has_val:
                self.model.eval()
                with torch.no_grad():
                    vl = float(self._loss(self.model(Xv), yv))
                rec["val_loss"] = vl
                if vl < best - 1e-5:
                    best, bad = vl, 0
                    best_state = {k: v.detach().clone() for k, v in self.model.state_dict().items()}
                else:
                    bad += 1
            self.history.append(rec)
            if has_val and bad >= self.patience:
                break
        if best_state is not None:
            self.model.load_state_dict(best_state)
        self.model.eval()
        if has_val and self.spec.kind in ("binary", "multiclass"):
            self._fit_temperature(Xv, yv)
        return self

    def _fit_temperature(self, Xv: torch.Tensor, yv: torch.Tensor) -> None:
        """Temperature scaling on the validation set (simple, robust calibration)."""
        with torch.no_grad():
            logits = self.model(Xv)
        best_t, best_nll = 1.0, math.inf
        for t in np.linspace(0.5, 3.0, 26):
            with torch.no_grad():
                nll = float(self._loss(logits / t, yv))
            if nll < best_nll:
                best_nll, best_t = nll, float(t)
        self.temperature = best_t

    def _logits(self, X: np.ndarray) -> torch.Tensor:
        assert self.model is not None, "model not fitted"
        self.model.eval()
        with torch.no_grad():
            return self.model(torch.as_tensor(X, dtype=torch.float32, device=self.device))

    def predict(self, X: np.ndarray) -> np.ndarray:
        if len(X) == 0:
            return np.zeros((0, self.out_dim) if self.spec.kind == "multiclass" else (0,), dtype=np.float32)
        logits = self._logits(X)
        if self.spec.kind == "binary":
            return torch.sigmoid(logits.squeeze(-1) / self.temperature).cpu().numpy()
        if self.spec.kind == "regression":
            return logits.squeeze(-1).cpu().numpy()
        return torch.softmax(logits / self.temperature, dim=-1).cpu().numpy()

    def feature_importance(self, names: list[str]) -> dict[str, float] | None:
        """Mean |∂output/∂input| over a probe batch stored at save time is expensive; use first-layer weight norms."""
        if self.model is None:
            return None
        first = next(m for m in self.model.net if isinstance(m, nn.Linear))
        w = first.weight.detach().abs().sum(dim=0).cpu().numpy()
        w = w / (w.sum() + 1e-9)
        return {n: float(v) for n, v in sorted(zip(names, w), key=lambda kv: -kv[1])[:15]}

    def save(self, d: Path) -> None:
        d = Path(d)
        d.mkdir(parents=True, exist_ok=True)
        assert self.model is not None
        torch.save(self.model.state_dict(), d / "mlp.pt")
        (d / "mlp.json").write_text(json.dumps({
            "in_dim": self.in_dim, "out_dim": self.out_dim, "hidden": list(self.hidden), "dropout": self.dropout,
            "temperature": self.temperature, "history": self.history[-5:],
        }), encoding="utf-8")

    @classmethod
    def load(cls, d: Path, spec: TaskSpec) -> "MlpPredictor":
        d = Path(d)
        cfg = json.loads((d / "mlp.json").read_text(encoding="utf-8"))
        p = cls(spec, hidden=tuple(cfg["hidden"]), dropout=cfg["dropout"])
        p.in_dim = cfg["in_dim"]
        p.temperature = cfg.get("temperature", 1.0)
        p.model = _Mlp(p.in_dim, p.out_dim, p.hidden, p.dropout).to(p.device)
        p.model.load_state_dict(torch.load(d / "mlp.pt", map_location=p.device))
        p.model.eval()
        return p


# ---------------------------------------------------------------------------
# Gradient boosting baseline
# ---------------------------------------------------------------------------

class GbdtPredictor(Predictor):
    backend = "gbdt"

    def __init__(self, spec: TaskSpec, seed: int = 7, max_iter: int = 300, learning_rate: float = 0.06):
        super().__init__(spec)
        self.seed = seed
        self.max_iter = max_iter
        self.learning_rate = learning_rate
        self.est: Any = None
        self._importance: np.ndarray | None = None

    def fit(self, X, y, X_val=None, y_val=None):
        common = dict(max_iter=self.max_iter, learning_rate=self.learning_rate, random_state=self.seed,
                      early_stopping=True, validation_fraction=0.1, n_iter_no_change=20, l2_regularization=0.5)
        if self.spec.kind == "regression":
            self.est = HistGradientBoostingRegressor(**common)
        else:
            self.est = HistGradientBoostingClassifier(**common)
        self.est.fit(X, y)
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        if len(X) == 0:
            return np.zeros((0, self.spec.num_classes) if self.spec.kind == "multiclass" else (0,), dtype=np.float32)
        if self.spec.kind == "regression":
            return self.est.predict(X).astype(np.float32)
        proba = self.est.predict_proba(X)
        if self.spec.kind == "binary":
            return proba[:, 1].astype(np.float32)
        # ensure k columns even if a class was absent in training
        out = np.zeros((len(X), self.spec.num_classes), dtype=np.float32)
        for j, c in enumerate(self.est.classes_):
            out[:, int(c)] = proba[:, j]
        return out

    def feature_importance(self, names: list[str]) -> dict[str, float] | None:
        # HistGB has no native importances; use permutation importance lazily computed at eval time (see evaluate.py)
        if self._importance is None:
            return None
        imp = self._importance / (self._importance.sum() + 1e-9)
        return {n: float(v) for n, v in sorted(zip(names, imp), key=lambda kv: -kv[1])[:15]}

    def save(self, d: Path) -> None:
        d = Path(d)
        d.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.est, d / "gbdt.joblib")
        if self._importance is not None:
            np.save(d / "gbdt_importance.npy", self._importance)

    @classmethod
    def load(cls, d: Path, spec: TaskSpec) -> "GbdtPredictor":
        d = Path(d)
        p = cls(spec)
        p.est = joblib.load(d / "gbdt.joblib")
        if (d / "gbdt_importance.npy").exists():
            p._importance = np.load(d / "gbdt_importance.npy")
        return p


# ---------------------------------------------------------------------------
# Rules baseline (what the agents implicitly assume today)
# ---------------------------------------------------------------------------

class RulesPredictor(Predictor):
    """
    binary     → constant training positive rate (e.g. donorResponseRate default 0.3)
    regression → constant median of training labels (model space); for donor_eta / delivery_time the
                 deterministic ETA is already a *feature* (etaMinutes) so we use it directly when present
    multiclass → the rule's own class (features carry the rule's urgency in meta) or majority class
    """

    backend = "rules"

    def __init__(self, spec: TaskSpec):
        super().__init__(spec)
        self.constant: float | np.ndarray = 0.5
        self.eta_col: int | None = None
        self.eta_mean = 0.0
        self.eta_std = 1.0

    def fit(self, X, y, X_val=None, y_val=None):
        if self.spec.kind == "binary":
            self.constant = float(np.mean(y)) if len(y) else 0.5
        elif self.spec.kind == "regression":
            self.constant = float(np.median(y)) if len(y) else 0.0
        else:
            counts = np.bincount(y.astype(int), minlength=self.spec.num_classes)
            self.constant = (counts / max(1, counts.sum())).astype(np.float32)
        return self

    def with_eta_feature(self, col_index: int | None, mean: float, std: float) -> "RulesPredictor":
        self.eta_col, self.eta_mean, self.eta_std = col_index, mean, std
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        n = len(X)
        if self.spec.kind == "multiclass":
            return np.tile(np.asarray(self.constant, dtype=np.float32), (n, 1))
        if self.spec.kind == "regression" and self.eta_col is not None and n:
            eta = X[:, self.eta_col] * self.eta_std + self.eta_mean  # de-standardise
            return np.log1p(np.clip(eta, 0, None)).astype(np.float32) if self.spec.log_target else eta.astype(np.float32)
        return np.full(n, float(self.constant), dtype=np.float32)

    def save(self, d: Path) -> None:
        d = Path(d)
        d.mkdir(parents=True, exist_ok=True)
        (d / "rules.json").write_text(json.dumps({
            "constant": self.constant.tolist() if isinstance(self.constant, np.ndarray) else self.constant,
            "eta_col": self.eta_col, "eta_mean": self.eta_mean, "eta_std": self.eta_std,
        }), encoding="utf-8")

    @classmethod
    def load(cls, d: Path, spec: TaskSpec) -> "RulesPredictor":
        cfg = json.loads((Path(d) / "rules.json").read_text(encoding="utf-8"))
        p = cls(spec)
        p.constant = np.asarray(cfg["constant"], dtype=np.float32) if isinstance(cfg["constant"], list) else cfg["constant"]
        p.eta_col, p.eta_mean, p.eta_std = cfg.get("eta_col"), cfg.get("eta_mean", 0.0), cfg.get("eta_std", 1.0)
        return p


def make_predictor(backend: str, spec: TaskSpec, **kw) -> Predictor:
    if backend == "mlp":
        return MlpPredictor(spec, **kw)
    if backend == "gbdt":
        return GbdtPredictor(spec, **{k: v for k, v in kw.items() if k in ("seed", "max_iter", "learning_rate")})
    if backend == "rules":
        return RulesPredictor(spec)
    raise ValueError(f"unknown backend {backend}")


def load_predictor(backend: str, d: Path, spec: TaskSpec) -> Predictor:
    return {"mlp": MlpPredictor, "gbdt": GbdtPredictor, "rules": RulesPredictor}[backend].load(d, spec)
