//RegisterContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { ImagePickerAsset } from "expo-image-picker";

export type Role = "Driver" | "Operator" | "Both";

export type RegisterState = {
  // step 1
  role: Role;

  // step 2 uploads (no selfie here)
  votersIDImage: ImagePickerAsset | null;
  driversLicenseImage: ImagePickerAsset | null;
  orcrImage: ImagePickerAsset | null;

  // step 3 personal + selfie
  selfieImage: ImagePickerAsset | null;

  operatorFirstName: string;
  operatorMiddleName: string;
  operatorLastName: string;
  operatorSuffix: string;
  operatorBirthdate: string;
  operatorPhone: string;

  driverFirstName: string;
  driverMiddleName: string;
  driverLastName: string;
  driverSuffix: string;
  driverBirthdate: string;
  driverPhone: string;

  experienceYears: string;

  // step 4
  franchiseNumber: string;
  todaName: string;
  sector: string;
  isLucenaVoter: string; // "Oo" | "Hindi"
  votingLocation: string;

  capacity: number; // 4 or 6
  trikeColor: "yellow" | "green" | "";
  plateNumber: string;

  // step 5
  email: string;
  password: string;
  confirmPassword: string;
};

const initial: RegisterState = {
  role: "Driver",

  votersIDImage: null,
  driversLicenseImage: null,
  orcrImage: null,

  selfieImage: null,

  operatorFirstName: "",
  operatorMiddleName: "",
  operatorLastName: "",
  operatorSuffix: "",
  operatorBirthdate: "",
  operatorPhone: "",

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
  isLucenaVoter: "",
  votingLocation: "",

  capacity: 4,
  trikeColor: "",
  plateNumber: "",

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
  if (!ctx) throw new Error("useRegister must be used inside RegisterProvider");
  return ctx;
}