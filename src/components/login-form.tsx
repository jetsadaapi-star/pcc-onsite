"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, Mail } from "lucide-react";

function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="login-submit" type="submit" disabled={pending}>
      <span>{pending ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ"}</span>
      {pending ? <LoaderCircle className="login-spinner" size={19} /> : <ArrowRight size={19} />}
    </button>
  );
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action="/api/login" method="post" className="login-form">
      <div className="login-field">
        <label htmlFor="email">อีเมล</label>
        <div className="login-input-wrap">
          <Mail size={19} aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            autoFocus
            required
          />
        </div>
      </div>

      <div className="login-field">
        <label htmlFor="password">รหัสผ่าน</label>
        <div className="login-input-wrap">
          <KeyRound size={19} aria-hidden="true" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่านของคุณ"
            required
          />
          <button
            className="login-password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>

      <LoginSubmitButton />
    </form>
  );
}
