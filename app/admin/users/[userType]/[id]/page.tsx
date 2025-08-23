import ProfileTabs from "@/components/ProfileTabs";
import { fetchUserDataById } from "@/lib/actions/user.actions";

export default async function UserDetailPage(props: {
  params: { userType: string; id: string };
}) {
  const { params } = props;
  const { userType, id } = params;

  const userData = await fetchUserDataById(
    id,
    userType as "donor" | "hospital"
  );

  if (!userData) {
    return (
      <div className="p-6 text-red-500 text-center text-lg">User not found</div>
    );
  }

  return (
    // <div className="p-6 min-h-screen bg-gradient-to-br from-red-900 via-red-900 to-yellow-600">
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {userType === "donor" ? "Donor Profile" : "Hospital Profile"}
      </h1>

      <ProfileTabs
        userType={userType as "donor" | "hospital"}
        userData={userData}
      />
    </div>
  );
}
