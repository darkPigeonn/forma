import { connectDb } from "@/db/client";
import { User } from "@/db/models/user";

export async function markOnboardingComplete(firebaseUid: string) {
  await connectDb();
  await User.updateOne(
    { firebaseUid },
    { $set: { onboardingCompletedAt: new Date() } },
  );
}

export async function completeUserProfile(input: {
  firebaseUid: string;
  name: string;
  phone?: string | null;
}) {
  await connectDb();
  const phone = input.phone?.trim() ? input.phone.trim() : null;

  return User.findOneAndUpdate(
    { firebaseUid: input.firebaseUid },
    {
      $set: {
        name: input.name.trim(),
        phone,
        profileCompletedAt: new Date(),
      },
    },
    { new: true },
  );
}
