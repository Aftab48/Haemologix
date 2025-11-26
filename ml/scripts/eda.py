#!/usr/bin/env python3
"""
Exploratory Data Analysis (EDA) for Haemologix ML Training Data

Analyzes training data across all 5 task types:
- Data size and splits
- Feature distributions
- Label distributions
- Correlations
- Data quality (missing values, outliers)
- Class imbalances
"""

import sys
from pathlib import Path
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.loaders import load_training_examples_from_json
from data.preprocessing import DataPreprocessor

# Set style for better plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)


def analyze_data_size(data_dir: Path) -> Dict[str, Any]:
    """Analyze data size and splits for all task types"""
    print("\n" + "="*80)
    print("DATA SIZE ANALYSIS")
    print("="*80)
    
    task_types = [
        "donor_selection",
        "urgency_assessment",
        "inventory_selection",
        "transport_planning",
        "eligibility_analysis",
    ]
    
    stats = {}
    
    for task_type in task_types:
        train_file = data_dir / f"{task_type}_train.json"
        val_file = data_dir / f"{task_type}_val.json"
        
        train_count = 0
        val_count = 0
        
        if train_file.exists():
            with open(train_file, 'r') as f:
                train_data = json.load(f)
                train_count = len(train_data)
        
        if val_file.exists():
            with open(val_file, 'r') as f:
                val_data = json.load(f)
                val_count = len(val_data)
        
        total = train_count + val_count
        train_ratio = train_count / total if total > 0 else 0
        val_ratio = val_count / total if total > 0 else 0
        
        stats[task_type] = {
            "train": train_count,
            "val": val_count,
            "total": total,
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
        }
        
        print(f"\n{task_type}:")
        print(f"  Train: {train_count} ({train_ratio*100:.1f}%)")
        print(f"  Val:   {val_count} ({val_ratio*100:.1f}%)")
        print(f"  Total: {total}")
    
    return stats


def analyze_feature_distributions(examples: List[Dict], task_type: str) -> Dict[str, Any]:
    """Analyze feature distributions for a task type"""
    print(f"\n{'='*80}")
    print(f"FEATURE DISTRIBUTIONS: {task_type}")
    print("="*80)
    
    preprocessor = DataPreprocessor()
    
    # Extract features
    numerical_features_list = []
    blood_types = []
    urgency_levels = []
    transport_methods = []
    
    for ex in examples:
        # Numerical features
        num_feat = preprocessor.extract_numerical_features(ex, task_type)
        numerical_features_list.append(num_feat)
        
        # Categorical features
        bt_idx, urg_idx, trans_idx = preprocessor.encode_categorical(ex, task_type)
        blood_types.append(bt_idx)
        urgency_levels.append(urg_idx)
        if trans_idx is not None:
            transport_methods.append(trans_idx)
    
    # Convert to arrays
    numerical_features = np.array(numerical_features_list)
    
    # Analyze numerical features
    print("\nNumerical Features:")
    print(f"  Shape: {numerical_features.shape}")
    print(f"  Mean: {numerical_features.mean(axis=0)[:5]}")  # First 5
    print(f"  Std:  {numerical_features.std(axis=0)[:5]}")
    print(f"  Min:  {numerical_features.min(axis=0)[:5]}")
    print(f"  Max:  {numerical_features.max(axis=0)[:5]}")
    
    # Analyze categorical features
    print("\nCategorical Features:")
    blood_type_counts = Counter(blood_types)
    urgency_counts = Counter(urgency_levels)
    transport_counts = Counter(transport_methods)
    
    print(f"  Blood Types: {dict(blood_type_counts)}")
    print(f"  Urgency Levels: {dict(urgency_counts)}")
    if transport_counts:
        print(f"  Transport Methods: {dict(transport_counts)}")
    
    return {
        "numerical": numerical_features,
        "blood_types": blood_types,
        "urgency_levels": urgency_levels,
        "transport_methods": transport_methods,
    }


def analyze_labels(examples: List[Dict], task_type: str) -> Dict[str, Any]:
    """Analyze label distributions for a task type"""
    print(f"\n{'='*80}")
    print(f"LABEL DISTRIBUTIONS: {task_type}")
    print("="*80)
    
    labels = []
    
    for ex in examples:
        label = ex.get("outputLabel", {})
        labels.append(label)
    
    if task_type == "donor_selection":
        selected_indices = [l.get("selected_index", -1) for l in labels]
        index_counts = Counter(selected_indices)
        print(f"Selected Candidate Indices: {dict(index_counts)}")
        print(f"Unique indices: {len(index_counts)}")
        print(f"Most common: {index_counts.most_common(5)}")
        
        return {"selected_indices": selected_indices}
    
    elif task_type == "urgency_assessment":
        urgency_classes = [l.get("urgency_class", -1) for l in labels]
        priority_scores = [l.get("priority_score", 0) for l in labels]
        class_counts = Counter(urgency_classes)
        
        print(f"Urgency Classes: {dict(class_counts)}")
        print(f"Priority Scores - Mean: {np.mean(priority_scores):.3f}, Std: {np.std(priority_scores):.3f}")
        print(f"Priority Scores - Min: {np.min(priority_scores):.3f}, Max: {np.max(priority_scores):.3f}")
        
        return {
            "urgency_classes": urgency_classes,
            "priority_scores": priority_scores,
        }
    
    elif task_type == "inventory_selection":
        selected_indices = [l.get("selected_index", -1) for l in labels]
        index_counts = Counter(selected_indices)
        print(f"Selected Source Indices: {dict(index_counts)}")
        print(f"Unique indices: {len(index_counts)}")
        
        return {"selected_indices": selected_indices}
    
    elif task_type == "transport_planning":
        methods = [l.get("method", -1) for l in labels]
        etas = [l.get("eta_minutes", 0) for l in labels]
        method_counts = Counter(methods)
        
        print(f"Transport Methods: {dict(method_counts)}")
        print(f"ETAs - Mean: {np.mean(etas):.2f} min, Std: {np.std(etas):.2f} min")
        print(f"ETAs - Min: {np.min(etas):.2f} min, Max: {np.max(etas):.2f} min")
        
        return {
            "methods": methods,
            "etas": etas,
        }
    
    elif task_type == "eligibility_analysis":
        eligible = [l.get("eligible", 0) for l in labels]
        eligible_counts = Counter(eligible)
        
        print(f"Eligible: {dict(eligible_counts)}")
        print(f"Eligibility Rate: {sum(eligible)/len(eligible)*100:.1f}%")
        
        return {"eligible": eligible}
    
    return {}


def analyze_candidates_and_sources(examples: List[Dict], task_type: str) -> Dict[str, Any]:
    """Analyze candidate/source distributions"""
    print(f"\n{'='*80}")
    print(f"CANDIDATE/SOURCE ANALYSIS: {task_type}")
    print("="*80)
    
    if task_type == "donor_selection":
        candidate_counts = []
        candidate_features_list = []
        
        for ex in examples:
            candidates = ex.get("inputFeatures", {}).get("candidates", [])
            candidate_counts.append(len(candidates))
            
            for cand in candidates:
                candidate_features_list.append({
                    "distance": cand.get("distance", 0),
                    "eta": cand.get("eta", 0),
                    "score": cand.get("score", 0),
                    "reliability": cand.get("reliability", 0),
                    "health": cand.get("health", 0),
                })
        
        print(f"Number of candidates per example:")
        print(f"  Mean: {np.mean(candidate_counts):.2f}")
        print(f"  Std:  {np.std(candidate_counts):.2f}")
        print(f"  Min:  {np.min(candidate_counts)}")
        print(f"  Max:  {np.max(candidate_counts)}")
        
        if candidate_features_list:
            df = pd.DataFrame(candidate_features_list)
            print(f"\nCandidate Features:")
            print(df.describe())
        
        return {
            "candidate_counts": candidate_counts,
            "candidate_features": candidate_features_list,
        }
    
    elif task_type == "inventory_selection":
        source_counts = []
        source_features_list = []
        
        for ex in examples:
            ranked_units = ex.get("inputFeatures", {}).get("rankedUnits", [])
            source_counts.append(len(ranked_units))
            
            for unit in ranked_units:
                scores = unit.get("scores", {})
                source_features_list.append({
                    "distance": unit.get("distance", 0),
                    "expiry": unit.get("expiry", 0),
                    "quantity": unit.get("quantity", 0),
                    "final_score": scores.get("final", 0) if isinstance(scores, dict) else 0,
                })
        
        print(f"Number of sources per example:")
        print(f"  Mean: {np.mean(source_counts):.2f}")
        print(f"  Std:  {np.std(source_counts):.2f}")
        print(f"  Min:  {np.min(source_counts)}")
        print(f"  Max:  {np.max(source_counts)}")
        
        if source_features_list:
            df = pd.DataFrame(source_features_list)
            print(f"\nSource Features:")
            print(df.describe())
        
        return {
            "source_counts": source_counts,
            "source_features": source_features_list,
        }
    
    return {}


def create_visualizations(data_dir: Path, output_dir: Path):
    """Create visualization plots"""
    print(f"\n{'='*80}")
    print("CREATING VISUALIZATIONS")
    print("="*80)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    task_types = [
        "donor_selection",
        "urgency_assessment",
        "inventory_selection",
        "transport_planning",
        "eligibility_analysis",
    ]
    
    for task_type in task_types:
        train_file = data_dir / f"{task_type}_train.json"
        if not train_file.exists():
            continue
        
        examples = load_training_examples_from_json(str(train_file), task_type)
        if len(examples) == 0:
            continue
        
        # Feature distributions
        feature_data = analyze_feature_distributions(examples, task_type)
        
        # Label distributions
        label_data = analyze_labels(examples, task_type)
        
        # Candidates/Sources
        candidate_data = analyze_candidates_and_sources(examples, task_type)
        
        # Create plots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle(f'EDA: {task_type}', fontsize=16, fontweight='bold')
        
        # Plot 1: Categorical distributions
        ax1 = axes[0, 0]
        if feature_data.get("blood_types"):
            blood_type_counts = Counter(feature_data["blood_types"])
            ax1.bar(blood_type_counts.keys(), blood_type_counts.values())
            ax1.set_xlabel('Blood Type Index')
            ax1.set_ylabel('Count')
            ax1.set_title('Blood Type Distribution')
            ax1.grid(True, alpha=0.3)
        
        # Plot 2: Urgency distribution
        ax2 = axes[0, 1]
        if feature_data.get("urgency_levels"):
            urgency_counts = Counter(feature_data["urgency_levels"])
            ax2.bar(urgency_counts.keys(), urgency_counts.values(), color='orange')
            ax2.set_xlabel('Urgency Level Index')
            ax2.set_ylabel('Count')
            ax2.set_title('Urgency Level Distribution')
            ax2.grid(True, alpha=0.3)
        
        # Plot 3: Label distribution
        ax3 = axes[1, 0]
        if task_type == "donor_selection" and label_data.get("selected_indices"):
            index_counts = Counter(label_data["selected_indices"])
            top_10 = dict(index_counts.most_common(10))
            ax3.bar(top_10.keys(), top_10.values(), color='green')
            ax3.set_xlabel('Selected Candidate Index')
            ax3.set_ylabel('Count')
            ax3.set_title('Selected Candidate Distribution (Top 10)')
            ax3.grid(True, alpha=0.3)
        elif task_type == "urgency_assessment" and label_data.get("urgency_classes"):
            class_counts = Counter(label_data["urgency_classes"])
            ax3.bar(class_counts.keys(), class_counts.values(), color='red')
            ax3.set_xlabel('Urgency Class')
            ax3.set_ylabel('Count')
            ax3.set_title('Urgency Class Distribution')
            ax3.grid(True, alpha=0.3)
        elif task_type == "eligibility_analysis" and label_data.get("eligible"):
            eligible_counts = Counter(label_data["eligible"])
            ax3.bar(eligible_counts.keys(), eligible_counts.values(), color='purple')
            ax3.set_xlabel('Eligible (0=No, 1=Yes)')
            ax3.set_ylabel('Count')
            ax3.set_title('Eligibility Distribution')
            ax3.grid(True, alpha=0.3)
        
        # Plot 4: Numerical feature distribution
        ax4 = axes[1, 1]
        if feature_data.get("numerical") is not None:
            num_feat = feature_data["numerical"]
            # Plot first non-zero feature
            for i in range(min(5, num_feat.shape[1])):
                if num_feat[:, i].std() > 0:
                    ax4.hist(num_feat[:, i], alpha=0.5, label=f'Feature {i}', bins=20)
            ax4.set_xlabel('Feature Value')
            ax4.set_ylabel('Frequency')
            ax4.set_title('Numerical Feature Distributions')
            ax4.legend()
            ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        output_path = output_dir / f"{task_type}_eda.png"
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Saved: {output_path}")
        plt.close()


def generate_summary_report(data_dir: Path, output_file: Path):
    """Generate a summary EDA report"""
    print(f"\n{'='*80}")
    print("GENERATING SUMMARY REPORT")
    print("="*80)
    
    task_types = [
        "donor_selection",
        "urgency_assessment",
        "inventory_selection",
        "transport_planning",
        "eligibility_analysis",
    ]
    
    report = []
    report.append("# Haemologix ML Training Data - EDA Report\n")
    report.append(f"Generated: {pd.Timestamp.now()}\n\n")
    
    # Data size summary
    report.append("## Data Size Summary\n\n")
    stats = analyze_data_size(data_dir)
    
    report.append("| Task Type | Train | Val | Total | Train % | Val % |\n")
    report.append("|-----------|-------|-----|-------|---------|-------|\n")
    for task_type, stat in stats.items():
        report.append(
            f"| {task_type} | {stat['train']} | {stat['val']} | {stat['total']} | "
            f"{stat['train_ratio']*100:.1f}% | {stat['val_ratio']*100:.1f}% |\n"
        )
    
    report.append("\n## Key Findings\n\n")
    
    # Check for issues
    issues = []
    for task_type, stat in stats.items():
        if stat['total'] < 100:
            issues.append(f"- {task_type}: Low data count ({stat['total']} examples)")
        if stat['train_ratio'] < 0.6 or stat['train_ratio'] > 0.9:
            issues.append(f"- {task_type}: Unbalanced train/val split ({stat['train_ratio']*100:.1f}% train)")
    
    if issues:
        report.append("### ⚠️ Potential Issues:\n\n")
        for issue in issues:
            report.append(f"{issue}\n")
    else:
        report.append("### ✅ No major issues detected\n\n")
    
    # Save report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(report)
    
    print(f"Report saved: {output_file}")


def main():
    import argparse
    
    # Get script directory and calculate default paths relative to ml/ directory
    script_dir = Path(__file__).parent
    ml_dir = script_dir.parent  # ml/ directory
    default_data_dir = ml_dir / "data"
    default_output_dir = ml_dir / "eda_output"
    default_report = ml_dir / "EDA_REPORT.md"
    
    parser = argparse.ArgumentParser(description="Exploratory Data Analysis for Haemologix ML")
    parser.add_argument("--data-dir", default=str(default_data_dir), help="Directory containing training data")
    parser.add_argument("--output-dir", default=str(default_output_dir), help="Directory to save visualizations")
    parser.add_argument("--report", default=str(default_report), help="Path to save summary report")
    parser.add_argument("--task-type", default=None, help="Specific task type to analyze (optional)")
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    
    print("="*80)
    print("HAEMOLOGIX ML - EXPLORATORY DATA ANALYSIS")
    print("="*80)
    print(f"Data Directory: {data_dir}")
    print(f"Output Directory: {output_dir}")
    
    # Analyze data size
    stats = analyze_data_size(data_dir)
    
    # Analyze specific task or all tasks
    task_types = [args.task_type] if args.task_type else [
        "donor_selection",
        "urgency_assessment",
        "inventory_selection",
        "transport_planning",
        "eligibility_analysis",
    ]
    
    # Detailed analysis for each task
    for task_type in task_types:
        train_file = data_dir / f"{task_type}_train.json"
        if not train_file.exists():
            print(f"\n⚠️  Skipping {task_type}: {train_file} not found")
            continue
        
        examples = load_training_examples_from_json(str(train_file), task_type)
        if len(examples) == 0:
            print(f"\n⚠️  Skipping {task_type}: No examples found")
            continue
        
        print(f"\n{'='*80}")
        print(f"ANALYZING: {task_type} ({len(examples)} examples)")
        print("="*80)
        
        # Feature analysis
        feature_data = analyze_feature_distributions(examples, task_type)
        
        # Label analysis
        label_data = analyze_labels(examples, task_type)
        
        # Candidate/Source analysis
        candidate_data = analyze_candidates_and_sources(examples, task_type)
    
    # Create visualizations
    create_visualizations(data_dir, output_dir)
    
    # Generate summary report
    generate_summary_report(data_dir, Path(args.report))
    
    print("\n" + "="*80)
    print("EDA COMPLETE")
    print("="*80)
    print(f"Visualizations saved to: {output_dir}")
    print(f"Summary report saved to: {args.report}")


if __name__ == "__main__":
    main()

