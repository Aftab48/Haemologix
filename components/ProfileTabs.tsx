"use client";

import { useState } from "react";
import { profileTabsConfig } from "@/configs/profileTabs";
import { formatLastActivity } from "@/lib/utils";

interface ProfileTabsProps {
  userType: "donor" | "hospital";
  userData: Record<string, any>;
}

export default function ProfileTabs({ userType, userData }: ProfileTabsProps) {
  const tabs = profileTabsConfig[userType];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="w-full ">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-300 mb-4">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === index
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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
              <p className="text-xs text-gray-500">{field.label}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {field.type === "boolean" ? (
                  value ? (
                    "✅ Yes"
                  ) : (
                    "❌ No"
                  )
                ) : field.type === "file" ? (
                  value !== "N/A" ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      View Document
                    </a>
                  ) : (
                    "Not Uploaded"
                  )
                ) : (
                  value || "N/A"
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
