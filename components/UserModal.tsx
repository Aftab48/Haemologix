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

  useEffect(() => {
    (async () => {
      const data = await fetchUserDataById(userId, userType);
      setUserData(data);
    })();
  }, [userId, userType]);

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {userType === "donor" ? "Donor Details" : "Hospital Details"}
          </DialogTitle>
        </DialogHeader>

        {userData ? (
          userType === "donor" ? (
            <>
              <p>
                <strong>Name:</strong>{" "}
                {`${userData.firstName} ${userData.lastName}`}
              </p>
              <p>
                <strong>Email:</strong> {userData.email}
              </p>
              <p>
                <strong>Blood Group:</strong> {userData.bloodGroup}
              </p>
              <p>
                <strong>Contact:</strong> {userData.phone}
              </p>
              <p>
                <strong>Last Donation:</strong>{" "}
                {formatLastActivity(userData.lastDonation) || "N/A"}
              </p>
              <Link
                href={`/admin/users/${userType}/${userData.id}`}
                className="text-blue-600 underline mt-4 block text-center"
              >
                View Full Profile
              </Link>
            </>
          ) : (
            <>
              <p>
                <strong>Hospital Name:</strong> {userData.hospitalName}
              </p>
              <p>
                <strong>Email:</strong> {userData.contactEmail}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {`${userData.hospitalAddress}, ${userData.city}, ${userData.state} - ${userData.pincode}`}
              </p>

              <p>
                <strong>License:</strong> {userData.bloodBankLicense}
              </p>
              <p>
                <strong>Active Alerts:</strong> {userData.alerts?.length || 0}
              </p>
              <Link
                href={`/admin/users/${userType}/${userData.id}`}
                className="text-blue-600 underline mt-4 block text-center"
              >
                View Full Profile
              </Link>
            </>
          )
        ) : (
          <p>Loading...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
