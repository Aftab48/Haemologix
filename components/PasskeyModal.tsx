"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { decryptKey, encryptKey } from "@/lib/utils";
import { X } from "lucide-react";

const PasskeyModal = () => {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");

  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessKey")
      : null;

  useEffect(() => {
    const accessKey = encryptedKey && decryptKey(encryptedKey);

    if (path)
      if (accessKey === process.env.NEXT_PUBLIC_ADMIN_PASSKEY!.toString()) {
        setOpen(false);
        router.push("/admin");
      } else {
        setOpen(true);
      }
  }, [encryptedKey]);

  const closeModal = () => {
    setOpen(false);
    router.push("/");
  };

  const validatePasskey = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();

    if (passkey === process.env.NEXT_PUBLIC_ADMIN_PASSKEY) {
      setOpen(false);
      router.push("/admin");
    } else {
      setError("Invalid passkey. Please try again.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="shad-alert-dialog bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 h-44 md:h-80">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start text-xl sm:text-2xl lg:text-3xl text-white justify-between">
            Admin Access Verification
            <X
              size={30}
              onClick={() => closeModal()}
              className="cursor-pointer"
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[rgba(154,117,31,1)] text-sm sm:text-base lg:text-lg">
            To access the admin page, please enter the passkey.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center h-full">
          <InputOTP
            maxLength={6}
            value={passkey}
            onChange={(value) => setPasskey(value)}
          >
            <InputOTPGroup className="shad-otp">
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={0}
              />
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={1}
              />
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={2}
              />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup className="shad-otp">
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={3}
              />
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={4}
              />
              <InputOTPSlot
                className="text-white shad-otp-slot w-14 h-14 text-xl"
                index={5}
              />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="shad-error text-14-regular mt-4 flex justify-center">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={(e) => validatePasskey(e)}
            className="shad-primary-btn w-full hover:bg-zinc-50 text-lg px-8 py-3 bg-slate-300 text-[rgba(154,117,31,1)] shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
          >
            Submit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PasskeyModal;
