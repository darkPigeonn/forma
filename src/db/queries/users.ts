import { connectDb } from "@/db/client";
import { User } from "@/db/models/user";

export async function markOnboardingComplete(firebaseUid: string) {
  await connectDb();
  await User.updateOne(
    { firebaseUid },
    { $set: { onboardingCompletedAt: new Date() } },
  );
}
