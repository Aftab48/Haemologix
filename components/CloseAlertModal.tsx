import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

export type DonorOption = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	bloodGroup?: string;
	status?: string; // accepted/declined/confirmed/etc
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	alertId: string;
	donorOptions?: DonorOption[]; // optional; component handles empty list UX
	onSuccess?: () => void; // called after successful close
};

export default function CloseAlertModal({ isOpen, onClose, alertId, donorOptions = [], onSuccess }: Props) {
	const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
	const [fulfillmentSource, setFulfillmentSource] = useState<string>("registered_donors");
	const [externalDonorEmail, setExternalDonorEmail] = useState("");
	const [otherDetails, setOtherDetails] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit() {
		if (fulfillmentSource === "registered_donors" && selectedDonors.length === 0) {
			alert("Please select at least one donor who donated");
			return;
		}
		if (fulfillmentSource === "external_donor" && !externalDonorEmail) {
			alert("Please provide the external donor's email");
			return;
		}
		if (fulfillmentSource === "other" && !otherDetails) {
			alert("Please provide details");
			return;
		}

		setIsSubmitting(true);
		try {
			// Confirm arrivals for registered donors
			if (fulfillmentSource === "registered_donors" && selectedDonors.length > 0) {
				for (const donorId of selectedDonors) {
					await fetch("/api/agents/coordinator", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ action: "confirm_arrival", request_id: alertId, donor_id: donorId }),
					});
				}
			}

			// Close alert with fulfillment metadata
			const res = await fetch(`/api/alerts/${alertId}/close`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					source: fulfillmentSource,
					donors: selectedDonors,
					externalDonorEmail: fulfillmentSource === "external_donor" ? externalDonorEmail : null,
					otherDetails: fulfillmentSource === "other" || fulfillmentSource === "hospital_bloodbank" ? otherDetails : null,
				}),
			});
			const json = await res.json();
			if (!json.success) {
				alert("Failed to close alert: " + json.error);
				return;
			}

			if (onSuccess) onSuccess();
			onClose();
		} catch (e) {
			console.error("[CloseAlertModal] Error:", e);
			alert("An error occurred while closing the alert");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-white text-xl">Close Alert & Record Fulfillment</DialogTitle>
					<DialogDescription className="text-gray-200">
						Please provide details about how this alert was fulfilled
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-2">
						<Label className="text-white text-base">How was this alert fulfilled?</Label>
						<Select value={fulfillmentSource} onValueChange={setFulfillmentSource}>
							<SelectTrigger className="bg-white/5 border-white/20 text-white">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="bg-gray-800 text-white border-gray-700">
								<SelectItem value="registered_donors">Registered Donor(s) from our platform</SelectItem>
								<SelectItem value="external_donor">External Donor (not registered)</SelectItem>
								<SelectItem value="hospital_bloodbank">Nearby Hospital/Blood Bank</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{fulfillmentSource === "registered_donors" && (
						<div className="space-y-3">
							<Label className="text-white text-base">Select donor(s) who donated:</Label>
							<div className="bg-white/5 border border-white/20 rounded-lg p-4 max-h-60 overflow-y-auto">
								{(donorOptions || []).length === 0 ? (
									<p className="text-gray-400 text-sm">No donor responses loaded</p>
								) : (
									<div className="space-y-2">
										{donorOptions.map((d) => (
											<label key={d.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors">
												<input
													type="checkbox"
													checked={selectedDonors.includes(d.id)}
													onChange={(e) => {
														if (e.target.checked) setSelectedDonors([...selectedDonors, d.id]);
														else setSelectedDonors(selectedDonors.filter((id) => id !== d.id));
													}}
													className="w-4 h-4 rounded border-white/20"
												/>
												<div className="flex-1">
													<p className="text-white font-medium">{d.firstName} {d.lastName}</p>
													<p className="text-gray-400 text-sm">{d.bloodGroup || ""}{d.bloodGroup ? " • " : ""}{d.email}</p>
												</div>
												<span className={`text-xs px-2 py-1 rounded ${d.status === "accepted" ? "bg-green-600" : "bg-gray-600"}`}>{d.status || ""}</span>
											</label>
										))}
									</div>
								)}
							</div>
							{selectedDonors.length > 0 && (
								<p className="text-green-400 text-sm">✓ {selectedDonors.length} donor(s) selected</p>
							)}
						</div>
					)}

					{fulfillmentSource === "external_donor" && (
						<div className="space-y-3">
							<Label className="text-white text-base">External Donor Email</Label>
							<Input
								type="email"
								placeholder="donor@example.com"
								value={externalDonorEmail}
								onChange={(e) => setExternalDonorEmail(e.target.value)}
								className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
							/>
							<p className="text-gray-400 text-sm">We'll send a thank you email to this donor</p>
						</div>
					)}

					{fulfillmentSource === "hospital_bloodbank" && (
						<div className="space-y-3">
							<Label className="text-white text-base">Hospital/Blood Bank Details</Label>
							<Textarea
								placeholder="Enter hospital name, location, contact person, etc."
								value={otherDetails}
								onChange={(e) => setOtherDetails(e.target.value)}
								className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
							/>
						</div>
					)}

					{fulfillmentSource === "other" && (
						<div className="space-y-3">
							<Label className="text-white text-base">Please provide details</Label>
							<Textarea
								placeholder="Describe how the alert was fulfilled..."
								value={otherDetails}
								onChange={(e) => setOtherDetails(e.target.value)}
								className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
							/>
						</div>
					)}

					<div className="flex gap-3 pt-4">
						<Button
							variant="outline"
							onClick={() => onClose()}
							disabled={isSubmitting}
							className="flex-1 border-white/20 hover:bg-white/20 text-white disabled:opacity-50"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center justify-center"
						>
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									Closing...
								</>
							) : (
								<>
									<CheckCircle className="w-4 h-4 mr-2" />
									Close Alert
								</>
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
