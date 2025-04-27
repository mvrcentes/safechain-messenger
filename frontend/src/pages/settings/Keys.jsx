import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createPublicKey, getPublicKey, updatePublicKey } from "@/api/keys/keys"
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey, downloadPrivateKeyPem } from "@/components/KeysFunctions"

const Keys = () => {
  const [hasKeys, setHasKeys] = useState(false)
  const [publicKey, setPublicKey] = useState("")

  useEffect(() => {
    async function fetchPublicKey() {
      try {
        const data = await getPublicKey()
        if (data.publicKey) {
          setPublicKey(data.publicKey)
          setHasKeys(true)
        }
      } catch (error) {
        console.error("❌ Error loading public key:", error)
      }
    }

    fetchPublicKey()
  }, [])

  async function handleEnableKeys() {
    try {
      const keyPair = await generateRSAKeyPair()

      const publicKeyPem = await exportPublicKey(keyPair.publicKey)
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey)

      await createPublicKey(publicKeyPem)
      setPublicKey(publicKeyPem)

      downloadPrivateKeyPem(privateKeyPem)

      setHasKeys(true)
    } catch (error) {
      console.error("❌ Error generating or saving keys:", error)
    }
  }

  async function handleRegenerateKeys() {
    try {
      const keyPair = await generateRSAKeyPair()

      const publicKeyPem = await exportPublicKey(keyPair.publicKey)
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey)

      await updatePublicKey(publicKeyPem)
      setPublicKey(publicKeyPem)

      downloadPrivateKeyPem(privateKeyPem)
    } catch (error) {
      console.error("❌ Error regenerating keys:", error)
    }
  }

  async function handleUpdateKeys() {
    try {
      if (publicKey) {
        await updatePublicKey(publicKey)
        console.log("✅ Public key updated successfully")
      }
    } catch (error) {
      console.error("❌ Error updating public key:", error)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-medium mb-2">Encryption Keys</h2>
      <p className="text-muted-foreground mb-4">
        Manage your public and private encryption keys for secure messaging.
      </p>

      <div className="space-y-6">
        <div className="pt-6 flex gap-4">
          {!hasKeys ? (
            <Button onClick={handleEnableKeys}>
              Enable Keys
            </Button>
          ) : (
            <>
              <Button onClick={handleUpdateKeys}>Update Keys</Button>
              <Button variant="secondary" onClick={handleRegenerateKeys}>Regenerate Keys</Button>
            </>
          )}
        </div>
        {publicKey && (
          <div className="mt-6 space-y-2">
            <Label>Public Key:</Label>
            <pre className="p-4 bg-muted rounded-md overflow-auto max-h-64">{publicKey}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default Keys