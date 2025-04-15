import React, { useState, useEffect } from "react"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"


import { setupMFA, verifyMFA } from "@/api/auth/mfa"

const MFASetup = ({ onVerified }) => {
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [verified, setVerified] = useState(false)

  const handleSetup = async () => {
    try {
      const { qrCode, secret } = await setupMFA()
      setQrCode(qrCode)
      setSecret(secret)
    } catch (err) {
      console.error("Error generating QR", err)
    }
  }

  const handleVerify = async () => {
    try {
      await verifyMFA({ token: code, secret })
      setVerified(true)
      toast.success("✅ MFA enabled!")
      if (onVerified) onVerified()
    } catch (err) {
      toast.error("Invalid MFA code")
      console.error("Invalid MFA code", err)
    }
  }

  useEffect(() => {
    handleSetup()
  }, [])

  return (
    <div className="space-y-4">
      {qrCode && (
        <div className="flex flex-col items-center gap-6">
          <img src={qrCode} alt="MFA QR Code" className="mx-auto w-60" />
          <InputOTP maxLength={6} value={code} onChange={setCode}>
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
          <Button onClick={handleVerify} disabled={code.length < 6}>
            Verify MFA
          </Button>
          {verified && (
            <p className="text-green-600 font-medium">✅ MFA enabled!</p>
          )}
        </div>
      )}
    </div>
  )
}

export default MFASetup
