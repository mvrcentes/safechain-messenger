import React from "react"
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

import { loginUser } from "@/api/auth/auth"
import { saveToken } from "../utils/utils"

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const Login = () => {
  const navigate = useNavigate()

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data) => {
    try {
      const { email, password } = data
      const response = await loginUser(email, password)

      saveToken(response.token)
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
    </Form>
  )
}

export default Login