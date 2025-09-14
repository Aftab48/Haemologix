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
      <AlertDialogContent
        className="
    shad-alert-dialog 
    bg-gradient-to-br from-red-900 via-red-900 to-yellow-600
    w-[92%] max-w-sm           /* narrower on mobile */
    max-h-[85vh] overflow-y-auto
    rounded-lg p-3 sm:p-5      /* tighter padding on mobile */
  "
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start text-lg sm:text-2xl lg:text-3xl text-white justify-between">
            Admin Access Verification
            <X
              size={26} /* smaller close icon on mobile */
              onClick={() => closeModal()}
              className="cursor-pointer"
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[rgba(154,117,31,1)] text-xs sm:text-base lg:text-lg">
            To access the admin page, please enter the passkey.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col items-center justify-center gap-3 mt-2">
          <InputOTP
            maxLength={6}
            value={passkey}
            onChange={(value) => setPasskey(value)}
          >
            <InputOTPGroup className="shad-otp flex">
              <InputOTPSlot
                index={0}
                className="w-10 h-10 text-base sm:w-12 sm:h-12 sm:text-lg md:w-14 md:h-14 md:text-xl text-white shad-otp-slot"
              />
              <InputOTPSlot
                index={1}
                className="w-10 h-10 text-base sm:w-12 sm:h-12 sm:text-lg md:w-14 md:h-14 md:text-xl text-white shad-otp-slot"
              />
              
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup className="shad-otp flex">
              <InputOTPSlot
                index={2}
                className="w-10 h-10 text-base sm:w-12 sm:h-12 sm:text-lg md:w-14 md:h-14 md:text-xl text-white shad-otp-slot"
              />
              <InputOTPSlot
                index={3}
                className="w-10 h-10 text-base sm:w-12 sm:h-12 sm:text-lg md:w-14 md:h-14 md:text-xl text-white shad-otp-slot"
              />
              
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="shad-error text-xs sm:text-sm mt-3 flex justify-center text-red-200">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter className="mt-3">
          <AlertDialogAction
            onClick={(e) => validatePasskey(e)}
            className="shad-primary-btn w-full hover:bg-zinc-50 text-base sm:text-lg px-4 py-2 sm:px-6 sm:py-3 bg-slate-300 text-[rgba(154,117,31,1)] shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
          >
            Submit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PasskeyModal;
