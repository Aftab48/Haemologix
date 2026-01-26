"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchUserDataById } from "@/lib/actions/user.actions";
import { formatLastActivity } from "@/lib/utils";
import Link from "next/link";

type Props = {
  userId: string;
  userType: "donor" | "hospital";
  onClose: () => void;
};

export function UserModal({ userId, userType, onClose }: Props) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await fetchUserDataById(userId, userType);
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, userType]);

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-text-dark">
            {userType === "donor" ? "Donor Details" : "Hospital Details"}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <p className="text-text-dark animate-pulse">
            Loading user details...
          </p>
        )}

        {/* Data Loaded */}
        {!loading && userData && (
          <>
            {userType === "donor" ? (
              <>
                <p className="text-text-dark">
                  <strong>Name:</strong>{" "}
                  {`${userData.firstName} ${userData.lastName}`}
                </p>
                <p className="text-text-dark">
                  <strong>Email:</strong> {userData.email}
                </p>
                <p className="text-text-dark">
                  <strong>Blood Group:</strong> {userData.bloodGroup}
                </p>
                <p className="text-text-dark">
                  <strong>Contact:</strong> {userData.phone}
                </p>
                <p className="text-text-dark">
                  <strong>Last Donation:</strong>{" "}
                  {formatLastActivity(userData.lastDonation) || "N/A"}
                </p>
              </>
            ) : (
              <>
                <p className="text-text-dark">
                  <strong>Hospital Name:</strong> {userData.hospitalName}
                </p>
                <p className="text-text-dark">
                  <strong>Email:</strong> {userData.contactEmail}
                </p>
                <p className="text-text-dark">
                  <strong>Address:</strong>{" "}
                  {`${userData.hospitalAddress}, ${userData.city}, ${userData.state} - ${userData.pincode}`}
                </p>
                <p className="text-text-dark">
                  <strong>License:</strong> {userData.bloodBankLicense}
                </p>
                <p className="text-text-dark">
                  <strong>Active Alerts:</strong>{" "}
                  {userData.alerts?.length || 0}
                </p>
              </>
            )}

            <Link
              href={`/admin/users/${userType}/${userData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline mt-4 block text-center"
            >
              View Full Profile
            </Link>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
