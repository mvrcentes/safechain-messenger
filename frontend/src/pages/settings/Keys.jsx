import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createPublicKey, getPublicKey, updatePublicKey, updateSigningKey } from "@/api/keys/keys"
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey, downloadPrivateKeyPem } from "@/components/KeysFunctions"

const Keys = () => {
  const [hasKeys, setHasKeys] = useState(false)
  const [publicKey, setPublicKey] = useState("")
  const [signingPublicKey, setSigningPublicKey] = useState("")
  async function handleGenerateSigningKeys() {
    try {
      const signingKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      )

      const signingPublicKeyPem = await exportPublicKey(signingKeyPair.publicKey)
      const signingPrivateKeyPem = await exportPrivateKey(signingKeyPair.privateKey)

      downloadPrivateKeyPem(signingPrivateKeyPem)
      setSigningPublicKey(signingPublicKeyPem)
      await updateSigningKey(signingPublicKeyPem)
    } catch (error) {
      console.error("❌ Error generating signing keys:", error)
    }
  }

  useEffect(() => {
    async function fetchPublicKey() {
      try {
        const data = await getPublicKey()
        if (data.publicKey) {
          setPublicKey(data.publicKey)
          setHasKeys(true)
        }
        if (data.signingPublicKey) {
          setSigningPublicKey(data.signingPublicKey)
        }
      } catch (error) {
        console.error("❌ Error loading public key:", error)
      }
    }

    fetchPublicKey()
  }, [])

  async function handleEnableKeys() {
    try {
      // Generate encryption key pair (RSA-OAEP)
      const keyPair = await generateRSAKeyPair()

      const publicKeyPem = await exportPublicKey(keyPair.publicKey)
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey)

      await createPublicKey(publicKeyPem)
      setPublicKey(publicKeyPem)

      downloadPrivateKeyPem(privateKeyPem)

      // Generate signing key pair (RSASSA-PKCS1-v1_5)
      const signingKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      )

      const signingPublicKeyPem = await exportPublicKey(signingKeyPair.publicKey)
      const signingPrivateKeyPem = await exportPrivateKey(signingKeyPair.privateKey)

      downloadPrivateKeyPem(signingPrivateKeyPem)

      setSigningPublicKey(signingPublicKeyPem)
      await updateSigningKey(signingPublicKeyPem)
      console.log("✅ Signing key updated")

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
      if (publicKey || signingPublicKey) {
        await updatePublicKey(publicKey)
        if (signingPublicKey) {
          await updateSigningKey(signingPublicKey)
        }
        console.log("✅ Keys updated successfully")
      }
    } catch (error) {
      console.error("❌ Error updating keys:", error)
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
        <div className="pt-6 flex gap-4">
          <Button onClick={handleGenerateSigningKeys}>Generate Signing Keys</Button>
        </div>
        {publicKey && (
          <div className="mt-6 space-y-2">
            <Label>Public Key:</Label>
            <pre className="p-4 bg-muted rounded-md overflow-auto max-h-64">{publicKey}</pre>
          </div>
        )}
        {signingPublicKey && (
          <div className="mt-6 space-y-2">
            <Label>Signing Public Key:</Label>
            <pre className="p-4 bg-muted rounded-md overflow-auto max-h-64">{signingPublicKey}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default Keys