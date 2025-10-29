"use client";

import { useState, useEffect } from "react";
import { profileTabsConfig } from "@/configs/profileTabs";
import { formatLastActivity } from "@/lib/utils";
import Image from "next/image";
import { db } from "@/db";
import { VerificationBadge, SuspensionBadge, AttemptsBadge } from "./VerificationBadge";
import { Badge } from "./ui/badge";

interface ProfileTabsProps {
  userType: "donor" | "hospital";
  userData: Record<string, any>;
}

export default function ProfileTabs({ userType, userData }: ProfileTabsProps) {
  const tabs = [
    ...profileTabsConfig[userType],
    { label: "Verification", fields: [] }, // Add verification tab
  ];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full ">
      {/* Verification Summary Banner */}
      {(userData.verificationAttempts !== undefined || userData.suspendedUntil) && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-text-dark mb-2">Verification Status</h3>
              <div className="flex gap-2 flex-wrap">
                {userData.suspendedUntil && new Date() < new Date(userData.suspendedUntil) && (
                  <SuspensionBadge suspendedUntil={userData.suspendedUntil} />
                )}
                {userData.verificationAttempts !== undefined && (
                  <AttemptsBadge attempts={userData.verificationAttempts} />
                )}
                <Badge variant="outline" className="bg-white">
                  Status: {userData.status || "PENDING"}
                </Badge>
              </div>
            </div>
            {userData.lastVerificationAt && (
              <div className="text-sm text-text-dark/70">
                Last verified: {formatLastActivity(userData.lastVerificationAt, false)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-gray-300 mb-4 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === index
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-text-dark/70 hover:text-text-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tabs[activeTab].label === "Verification" ? (
        <div className="space-y-6">
          {/* Verification Overview */}
          <div className="bg-white rounded-xl shadow p-6 border">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Verification Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-dark/70">Verification Attempts</p>
                <p className="text-2xl font-bold text-text-dark">
                  {userData.verificationAttempts || 0}/3
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-dark/70">Account Status</p>
                <p className="text-2xl font-bold text-text-dark">
                  {userData.suspendedUntil && new Date() < new Date(userData.suspendedUntil) 
                    ? "Suspended" 
                    : userData.status || "PENDING"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-text-dark/70">Last Verification</p>
                <p className="text-sm font-semibold text-text-dark">
                  {userData.lastVerificationAt 
                    ? formatLastActivity(userData.lastVerificationAt, false)
                    : "Not verified yet"}
                </p>
              </div>
            </div>
          </div>

          {/* Suspension Info */}
          {userData.suspendedUntil && new Date() < new Date(userData.suspendedUntil) && (
            <div className="bg-red-50 border border-red-200 rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Account Suspended</h3>
              <p className="text-sm text-red-700 mb-4">
                This account has been suspended due to 3 failed verification attempts.
              </p>
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-text-dark/70">Suspension Ends</p>
                <p className="text-lg font-semibold text-text-dark">
                  {new Date(userData.suspendedUntil).toLocaleString()}
                </p>
                <p className="text-sm text-text-dark/70 mt-2">
                  Days remaining: {Math.ceil((new Date(userData.suspendedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                </p>
              </div>
            </div>
          )}

          {/* Documents Info */}
          {userType === "donor" && (
            <div className="bg-white rounded-xl shadow p-6 border">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Uploaded Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-text-dark/70 mb-2">Blood Test Report</p>
                  {userData.bloodTestReport ? (
                    <a
                      href={userData.bloodTestReport}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-text-dark/70">Not uploaded</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-text-dark/70 mb-2">ID Proof</p>
                  {userData.idProof ? (
                    <a
                      href={userData.idProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-text-dark/70">Not uploaded</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-text-dark/70 mb-2">Medical Certificate</p>
                  {userData.medicalCertificate ? (
                    <a
                      href={userData.medicalCertificate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      View Document
                    </a>
                  ) : (
                    <p className="text-sm text-text-dark/70">Not uploaded</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Admin Actions</h3>
            <div className="space-y-3">
              <p className="text-sm text-text-dark/80">
                Review the user's information and documents carefully before making a decision.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                  Approve User
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                  Reject User
                </button>
                {userData.suspendedUntil && new Date() < new Date(userData.suspendedUntil) && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Lift Suspension
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Note for future verification history */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow p-6">
            <p className="text-sm text-text-dark/80">
              <strong>Note:</strong> Detailed verification history (extracted fields, mismatch details, OCR confidence scores) 
              from the DonorVerification table will be displayed here once the database query is implemented.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tabs[activeTab].fields.map((field) => {
            let value = userData[field.key];

            // Only format if field.type === 'date' AND value is a string or Date
            if (
              field.type === "date" &&
              value &&
              (typeof value === "string" || value instanceof Date)
            ) {
              value = formatLastActivity(value, false);
            }

            // Prevent rendering objects or arrays
            if (typeof value === "object" && value !== null) {
              value = "N/A";
            }

            return (
              <div
                key={field.key}
                className="bg-white rounded-xl shadow p-4 border transition-shadow duration-300 hover:shadow-xl hover:shadow-blue-400/70"
              >
                <p className="text-xs text-text-dark/70">{field.label}</p>
                <p className="text-sm font-semibold text-text-dark mt-1">
                  {field.type === "boolean"
                    ? value
                      ? "✅ Yes"
                      : "❌ No"
                    : field.type === "file"
                    ? value !== "N/A"
                      ? (() => {
                          const fileUrl: string = value;
                          const extension = fileUrl
                            .split(".")
                            .pop()
                            ?.toLowerCase();

                          if (
                            extension === "jpg" ||
                            extension === "jpeg" ||
                            extension === "png"
                          ) {
                            return (
                              <img
                                src={fileUrl}
                                alt={field.label}
                                
                                className="rounded-md w-64 h-64 border"
                              />
                            );
                          } else if (extension === "pdf") {
                            return (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline"
                              >
                                View PDF
                              </a>
                            );
                          } else {
                            return "Not Uploaded";
                          }
                        })()
                      : "Not Uploaded"
                    : value || "N/A"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
