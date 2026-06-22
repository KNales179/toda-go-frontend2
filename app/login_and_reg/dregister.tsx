import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function DRegister() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login_and_reg/register/step1-personal");
  }, []);

  return null;
}