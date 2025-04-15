import React, { useState, useEffect } from "react"
import { getMFAStatus, disableMFA } from "@/api/auth/mfa"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import MFASetup from "./MFASetup"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMobileScreenButton } from "@fortawesome/free-solid-svg-icons"
import { toast } from "sonner"

const MFA = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const mfa = await getMFAStatus()
        setMfaEnabled(mfa)
        setEnabled(mfa)
      } catch (err) {
        console.error("Error fetching MFA status:", err)
      }
    }

    fetchStatus()
  }, [])

  const handleDisableMFA = async () => {
    try {
      await disableMFA()
      toast.success("MFA disabled")
      setMfaEnabled(false)
      setEnabled(false)
    } catch (err) {
      toast.error("Failed to disable MFA")
      console.error("Error disabling MFA:", err)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-medium mb-2">Multi-Factor Authentication</h2>
      <p className="text-muted-foreground mb-4">
        Secure your account by enabling MFA using TOTP (Google Authenticator).
      </p>

      {!mfaEnabled && (
        <>
          <div className="flex items-center space-x-2 mb-6">
            <Switch
              id="mfa-switch"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="mfa-switch">Enable MFA</Label>
          </div>
          {enabled && <MFASetup onVerified={() => setMfaEnabled(true)} />}
        </>
      )}

      {mfaEnabled && (
        <div className="flex items-center justify-between border p-4 rounded-md">
          <div className="flex items-center space-x-4">
            <FontAwesomeIcon icon={faMobileScreenButton} className="text-2xl" />
            <div>
              <p className="font-medium">Authenticator app</p>
              <p className="text-sm text-muted-foreground">
                Time-based one-time password (TOTP)
              </p>
            </div>
          </div>
          <button
            onClick={handleDisableMFA}
            className="text-red-600 hover:underline text-sm">
            Disable
          </button>
        </div>
      )}
    </div>
  )
}

export default MFA
