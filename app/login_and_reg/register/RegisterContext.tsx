import React, { createContext, useContext, useMemo, useState } from "react";
import { ImagePickerAsset } from "expo-image-picker";

export type RegisterState = {
  // Step 1: Personal Details
  driverFirstName: string;
  driverMiddleName: string;
  driverLastName: string;
  driverSuffix: string;
  driverBirthdate: string;
  driverPhone: string;

  // Step 2: Tricycle / Franchise Info + Driver's License
  experienceYears: string;
  franchiseNumber: string;
  todaName: string;
  sector: string;

  capacity: number;
  trikeColor: "yellow" | "green" | "";
  plateNumber: string;

  driversLicenseImage: ImagePickerAsset | null;

  // Step 3: Mobile Verification + Selfie / Face Verification
  mobileCode: string;
  isMobileVerified: boolean;
  selfieImage: ImagePickerAsset | null;

  // Step 4: Account Submit
  email: string;
  password: string;
  confirmPassword: string;
};

const initial: RegisterState = {
  driverFirstName: "",
  driverMiddleName: "",
  driverLastName: "",
  driverSuffix: "",
  driverBirthdate: "",
  driverPhone: "",

  experienceYears: "",
  franchiseNumber: "",
  todaName: "",
  sector: "",

  capacity: 4,
  trikeColor: "",
  plateNumber: "",

  driversLicenseImage: null,

  mobileCode: "",
  isMobileVerified: false,
  selfieImage: null,

  email: "",
  password: "",
  confirmPassword: "",
};

type Ctx = {
  state: RegisterState;
  setState: React.Dispatch<React.SetStateAction<RegisterState>>;
  patch: (p: Partial<RegisterState>) => void;
  reset: () => void;
};

const RegisterCtx = createContext<Ctx | null>(null);

export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RegisterState>(initial);

  const value = useMemo<Ctx>(() => {
    return {
      state,
      setState,
      patch: (p) => setState((s) => ({ ...s, ...p })),
      reset: () => setState(initial),
    };
  }, [state]);

  return <RegisterCtx.Provider value={value}>{children}</RegisterCtx.Provider>;
}

export function useRegister() {
  const ctx = useContext(RegisterCtx);

  if (!ctx) {
    throw new Error("useRegister must be used inside RegisterProvider");
  }

  return ctx;
}