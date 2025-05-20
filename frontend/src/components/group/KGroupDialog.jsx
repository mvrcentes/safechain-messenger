import React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  importPrivateKey,
  concatUint8Arrays,
  hkdf,
  safeImportPemKey,
  hashPublicKey,
  decryptAESGCMBytes,
} from "@/lib/crypto"
import { getPreKeysByUserId } from "@/api/keys/keys"
import { getUserIdFromToken } from "@/api/ws/socket"
import { MultiFileDropzone } from "@/components/MultiFileDropZone"

const KGroupDialog = ({ open, onOpenChange, groupId }) => {
  const [kGroup, setKGroup] = React.useState(null)
  const [privateKeys, setPrivateKeys] = React.useState(null)
  const [kGroupFileItems, setKGroupFileItems] = React.useState([])
  const [privateKeyFileItems, setPrivateKeyFileItems] = React.useState([])

  const handleKGroupFilesAdded = async (addedFiles) => {
    if (addedFiles.length === 0) return
    const file = addedFiles[0].file
    const text = await file.text()

    try {
      const json = JSON.parse(text)

      // ✅ Validación para archivo de K_group
      if (!json.groupId || !json.encryptedKey || !json.ephemeralKey) {
        throw new Error("Formato inválido del archivo del grupo")
      }

      setKGroup(json)
      setKGroupFileItems(addedFiles)
      toast.success("🟢 Clave de grupo cargada exitosamente.")
    } catch (err) {
      console.error("❌ Error parsing K_group file:", err)
      toast.error("❌ Archivo de clave de grupo inválido")
    }
  }

  const handlePrivateKeysFilesAdded = async (addedFiles) => {
    console.log("📥 Archivos agregados:", addedFiles)
    if (addedFiles.length === 0) return
    if (addedFiles.length === 0) return
    const file = addedFiles[0].file
    const text = await file.text()
    try {
      const json = JSON.parse(text)

      console.log("🧩 Claves cargadas desde archivo:", json)
      // Validación rápida
      if (!json.IK || !json.SPK || !json.OPKs) {
        throw new Error("Formato inválido de claves privadas")
      }

      setPrivateKeys(json) // para lógica
      setPrivateKeyFileItems(addedFiles) // para UI
      toast.success("🔑 Claves privadas cargadas exitosamente.")
    } catch (err) {
      console.error("❌ Error parsing keys:", err)
      toast.error("❌ Archivo de claves inválido")
    }
  }

  const handleDecryptKGroup = async () => {
    if (!kGroup?.encryptedKey || !kGroup?.ephemeralKey || !privateKeys) {
      toast.error("❌ Faltan archivos para descifrar la clave.")
      return
    }

    try {
      const { encryptedKey, ephemeralKey, opkUsed } = kGroup

      console.log("📦 encryptedKey:", encryptedKey)
      console.log("🔑 ephemeralKey:", ephemeralKey)

      const IK_priv = await importPrivateKey(privateKeys.IK)
      const SPK_priv = await importPrivateKey(privateKeys.SPK)
      let OPK_priv = null

      // Fetch public OPKs from backend and match by hash
      console.log("🎯 Buscando OPK con hash objetivo:", opkUsed)
      const myUserId = getUserIdFromToken()
      const { OPKs: publicOpks } = await getPreKeysByUserId(myUserId)
      console.log("🌐 OPKs públicas obtenidas:", publicOpks)
      for (const [idx, { publicKey }] of publicOpks.entries()) {
        const hash = await hashPublicKey(publicKey)
        console.log(`🔍 Probando OPK pública #${idx + 1} con hash:`, hash)
        if (hash === opkUsed) {
          console.log("✅ OPK pública coincidente encontrada:", publicKey)
          // Usa el mismo índice para la OPK privada correspondiente
          OPK_priv = await importPrivateKey(privateKeys.OPKs[idx])
          break
        }
      }

      if (!OPK_priv) {
        throw new Error("❌ No se encontró el OPK correspondiente al hash")
      }

      const EK_A_pub = await safeImportPemKey({
        pem: ephemeralKey,
        format: "spki",
        algorithm: { name: "ECDH", namedCurve: "P-256" },
        extractable: true,
        usages: [],
      })

      console.log("✅ Claves importadas correctamente")

      // Derivación de secretos
      const DH1 = await crypto.subtle.deriveBits(
        { name: "ECDH", public: EK_A_pub },
        IK_priv,
        256
      )
      const DH3 = await crypto.subtle.deriveBits(
        { name: "ECDH", public: EK_A_pub },
        SPK_priv,
        256
      )
      const DH4 = await crypto.subtle.deriveBits(
        { name: "ECDH", public: EK_A_pub },
        OPK_priv,
        256
      )

      function toHex(uint8Array) {
        return [...new Uint8Array(uint8Array)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      }
      console.log("🔬 DH values (hex):")
      console.log("DH1:", toHex(DH1))
      console.log("DH3:", toHex(DH3))
      console.log("DH4:", toHex(DH4))

      const K_input = concatUint8Arrays(
        new Uint8Array(DH1),
        new Uint8Array(DH3),
        new Uint8Array(DH4)
      )

      const K_AB = await hkdf(K_input, 32)

      console.log(
        "🧬 K_AB derivado (Base64):",
        btoa(String.fromCharCode(...K_AB))
      )

      // Decrypt the binary group key
      const decryptedBytes = await decryptAESGCMBytes(encryptedKey, K_AB)
      console.log("✅ K_GROUP descifrada (bytes):", decryptedBytes)

      // Store the group key as Base64
      if (!groupId) {
        toast.error("❌ No se proporcionó el ID del grupo.")
        return
      }

      const base64GroupKey = btoa(String.fromCharCode(...decryptedBytes))
      localStorage.setItem(`k_group_${groupId}`, base64GroupKey)
      toast.success("🔓 Clave de grupo descifrada y guardada.")
    } catch (err) {
      console.error("❌ Error al descifrar la clave del grupo:", err)
      toast.error("❌ Error al descifrar la clave del grupo.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="mt-4 space-y-4 p-4">
            <h1>Llave del grupo cifrada</h1>
            <p className="text-sm text-muted-foreground">
              Aquí podrás cargar tu archivo `.json` con la clave privada para el
              grupo.
            </p>
            <MultiFileDropzone
              value={kGroupFileItems}
              onChange={setKGroupFileItems}
              onFilesAdded={handleKGroupFilesAdded}
              dropzoneOptions={{
                accept: { "application/json": [".json"] },
                maxFiles: 1,
              }}
            />
          </div>

          <div className="mt-4 space-y-4 p-4">
            <h1>Llaves privadas</h1>
            <p className="text-sm text-muted-foreground">
              Aquí podrás cargar tu archivo `.json` con las claves privadas para
            </p>
            <MultiFileDropzone
              value={privateKeyFileItems}
              onChange={setPrivateKeyFileItems}
              onFilesAdded={handlePrivateKeysFilesAdded}
              dropzoneOptions={{
                accept: { "application/json": [".json"] },
                maxFiles: 1,
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleDecryptKGroup}>Descifrar y guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default KGroupDialog
