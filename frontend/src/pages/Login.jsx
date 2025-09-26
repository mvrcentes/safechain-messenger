import React, { useState, useEffect } from "react"
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
import { checkAndCreatePreKeys } from "@/api/keys/keys"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const Login = ({ prefilledEmail = "" }) => {
  const [mfaStage, setMfaStage] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaEmail, setMfaEmail] = useState("")
  const navigate = useNavigate()

  const [cooldownUntil, setCooldownUntil] = useState(null) // timestamp (ms)
  const [cooldownLeft, setCooldownLeft] = useState(0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: prefilledEmail || "",
      password: "",
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
      await checkAndCreatePreKeys()
      console.log("✅ Logged in:", response)
      // Redirige al home
      navigate("/")
      toast.success("Login successful!")
    } catch (error) {
      console.error("❌ Login error:", error)
      const status = error?.response?.status
      const message = error?.response?.data?.error

      if (status === 429) {
        // Leer Retry-After (segundos) si viene del backend
        const retryAfterHeader = error.response.headers?.["retry-after"]
        let seconds = parseInt(retryAfterHeader, 10)

        // Alternativa: RateLimit-Reset (timestamp en segundos, depende del proxy)
        if (!seconds) {
          const rlReset = error.response.headers?.["ratelimit-reset"]
          if (rlReset) {
            const resetMs = parseInt(rlReset, 10) * 1000
            seconds = Math.max(0, Math.ceil((resetMs - Date.now()) / 1000))
          }
        }

        // Fallback si no hay headers
        if (!seconds || Number.isNaN(seconds)) seconds = 60

        setCooldownUntil(Date.now() + seconds * 1000)
        toast.error(message || `Too many attempts. Try again in ${seconds}s`)
        return
      }

      // Política actual en backend:
      // 400 -> password < 8
      if (
        status === 400 &&
        message === "Password must be at least 8 characters"
      ) {
        toast.error("Password must be at least 8 characters")
        return
      }

      // 401 -> mensaje genérico
      if (status === 401 && message === "Invalid credentials") {
        toast.error("Invalid credentials")
        return
      }

      // Compatibilidad con mensajes antiguos (por si algo queda en el cliente)
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

  useEffect(() => {
    if (!cooldownUntil) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
      setCooldownLeft(left)
      if (left <= 0) {
        setCooldownUntil(null)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

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

        <Button type="submit" className="ml-0" disabled={!!cooldownUntil}>
          {cooldownUntil ? `Try again in ${cooldownLeft}s` : "Login"}
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
