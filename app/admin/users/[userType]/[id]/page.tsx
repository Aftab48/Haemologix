import ProfileTabs from "@/components/ProfileTabs";
import { fetchUserDataById } from "@/lib/actions/user.actions";
import GradientBackground from "@/components/GradientBackground";

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
      <div className="p-6 text-red-800 text-center text-lg">User not found</div>
    );
  }

  console.log("Profile data:", userData);

  return (
    <GradientBackground className="p-6">
      <h1 className="text-2xl font-outfit font-bold text-text-dark mb-6">
        {userType === "donor" ? "Donor Profile" : "Hospital Profile"}
      </h1>
      

      <ProfileTabs
        userType={userType as "donor" | "hospital"}
        userData={userData}
      />
    </GradientBackground>
  );
}
