import ProfileTabs from "@/components/ProfileTabs";
import { fetchUserDataById } from "@/lib/actions/user.actions";
import GradientBackground from "@/components/GradientBackground";

export default async function UserDetailPage(props: {
  params: Promise<{ userType: string; id: string }>;
}) {
  const { userType, id } = await props.params;

  let userData = null;
  try {
    userData = await fetchUserDataById(
      id,
      userType as "donor" | "hospital"
    );
  } catch (error) {
    console.error("User profile data is unavailable:", error);
  }

  if (!userData) {
    return (
      <GradientBackground className="flex min-h-screen items-center justify-center p-6">
        <section className="glass-morphism w-full max-w-xl p-8 text-left">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Admin / profile lookup
          </p>
          <h1 className="mt-3 text-4xl font-bold uppercase text-text-dark">
            User record unavailable
          </h1>
          <p className="mt-3 text-text-dark/70">
            This profile could not be found, or the data service is temporarily offline.
          </p>
        </section>
      </GradientBackground>
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
