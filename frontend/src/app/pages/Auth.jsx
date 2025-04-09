import React, { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import Login from "@/pages/Login"
import Register from "@/pages/Register"

const Auth = () => {
  const [tab, setTab] = useState("login")
  const [prefilledEmail, setPrefilledEmail] = useState("")
  const handleRegistered = (email) => {
    setPrefilledEmail(email)
    setTab("login")
  }

  return (
    <div className="flex justify-center items-center min-h-screen min-w-screen">
      <Tabs value={tab} onValueChange={setTab} className="w-[400px] space-y-4 ">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-muted p-1 rounded-md">
          <TabsTrigger value="login">Login</TabsTrigger>

          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Inicia sesión con tu cuenta existente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Login prefilledEmail={prefilledEmail} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Registro</CardTitle>
              <CardDescription>
                Crea una nueva cuenta para comenzar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Register onRegistered={handleRegistered} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Auth
