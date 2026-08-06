"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { authApi } from "@/features/auth/services/auth.api";
import { useAuth } from "@/store/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const isLogin = mode === "login";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const auth = isLogin
        ? await authApi.login(email, password)
        : await authApi.register(email, password);
      setSession(auth);
      toast.success(isLogin ? "Welcome back" : "Account created");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(errorMessage(err, "Authentication failed"));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Mic size={22} />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="text-sm text-zinc-500">AI Meeting Assistant</p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-zinc-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
