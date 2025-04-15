import React, { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { saveToken } from "@/utils/utils"

import { loginUser, loginWithMFA } from "@/api/auth/auth"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const Login = ({ prefilledEmail = "" }) => {
  const [mfaStage, setMfaStage] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaEmail, setMfaEmail] = useState("")
  const navigate = useNavigate()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: prefilledEmail || "test@test.com",
      password: "12345678",
    },
  })

  const onSubmit = async (data) => {
    try {
      const { email, password } = data
      const response = await loginUser(email, password)

      if (response.status === 206 && response.data.mfaRequired) {
        setMfaStage(true)
        setMfaEmail(email)
        toast("MFA required. Please enter your code.")
        return
      }

      const cookies = document.cookie
      console.log(response.headers)
      console.log("Cookies:", cookies)

      console.log({ response })

      saveToken(response.data.token)
      console.log("✅ Logged in:", response)
      // Redirige al home
      navigate("/")
      toast.success("Login successful!")
    } catch (error) {
      console.error("❌ Login error:", error)
      const message = error.response?.data?.error

      if (message === "User not found") {
        toast.error("❌ Email not registered")
      } else if (message === "Incorrect password") {
        toast.error("❌ Incorrect password")
      } else {
        toast.error("Login failed. Please try again.")
      }
    }
  }
  const handleMFAVerify = async () => {
    try {
      const response = await loginWithMFA(mfaEmail, mfaCode)
      saveToken(response.data.token)
      navigate("/")
      toast.success("✅ MFA login successful!")
    } catch (error) {
      toast.error("❌ Invalid MFA code: " + error.response?.data?.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="ml-0">
          Login
        </Button>
      </form>
      {mfaStage && (
        <div className="space-y-4 pt-6">
          <h3 className="text-lg font-medium">Enter MFA Code</h3>
          <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <Button
            type="button"
            onClick={handleMFAVerify}
            disabled={mfaCode.length !== 6}>
            Verify MFA
          </Button>
        </div>
      )}
    </Form>
  )
}

export default Login
