import axios from "@/lib/axios"
import { getPreKeysByUserId } from "@/api/keys/keys"
import { getUserIdFromToken } from "@/api/ws/socket"
import { exportKey, generateEphemeralKey, hashPublicKey } from "@/lib/crypto"
import {
  importAllKeys,
  deriveSharedSecret,
  encryptKeyWithSharedSecret,
} from "@/lib/x3dh/x3dh"

// Use globalThis.btoa for compatibility (browser)
const toBase64 = (arr) =>
  (typeof btoa !== "undefined"
    ? btoa
    : globalThis.btoa)(String.fromCharCode(...arr))

export const createGroup = async ({
  name,
  memberIds,
  privateKeys,
  preKeyMap,
}) => {
  // Solo importamos las llaves necesarias para X3DH del primer usuario para validar la importación
  const { IK, SPK, OPK } = preKeyMap[memberIds[0]] // solo usamos el primer usuario como prueba

  const { privateKey: EK_A_priv, publicKey: EK_A_pub } =
    await generateEphemeralKey()
  const exportedEphemeralKey = await exportKey(EK_A_pub, "spki")
  const EK_priv = await exportKey(EK_A_priv, "pkcs8")

  const IK_priv = privateKeys.IK

  const keys = await importAllKeys({
    IK_priv,
    EK_priv,
    IK_pub: IK,
    SPK_pub: SPK,
    OPK_pub: OPK,
  })

  console.log("✅ Llaves importadas correctamente:", keys)

  // Derivar secreto compartido K_AB
  const K_AB = await deriveSharedSecret(keys)

  console.log("🔐 Secreto compartido derivado (K_AB):", K_AB)

  // Generar clave simétrica del grupo
  const kGroup = crypto.getRandomValues(new Uint8Array(32))
  console.log("🔐 Clave del grupo generada (kGroup):", kGroup)

  // Cifrar la clave del grupo usando K_AB
  const encryptedKey = await encryptKeyWithSharedSecret(kGroup, K_AB)

  console.log("📦 Clave del grupo cifrada:", encryptedKey)

  // Construir el arreglo de deliveries para el backend
  const deliveries = []

  for (const userId of memberIds) {
    const { IK, SPK, OPK } = preKeyMap[userId]
    console.log(`🔎 userId: ${userId}`)
    console.log("🧪 OPK usado:", OPK)

    const keys = await importAllKeys({
      IK_priv,
      EK_priv,
      IK_pub: IK,
      SPK_pub: SPK,
      OPK_pub: OPK,
    })

    const K_AB = await deriveSharedSecret(keys)
    // Log Base64 form for comparison
    const K_AB_b64 = toBase64(K_AB)
    console.log(`🔐 [CREATE] K_AB for user ${userId} (Base64):`, K_AB_b64)

    const encryptedKey = await encryptKeyWithSharedSecret(kGroup, K_AB)
    console.log("🔍 Probando OPK:", OPK)
    const opkHash = await hashPublicKey(OPK)

    deliveries.push({
      userId,
      encryptedKey,
      opkHash,
    })
  }

  // SELF‐ENCRYPTION: derive using *your* public keys fetched from the server
  const myUserId = getUserIdFromToken()
  const {
    IK: IK_pub_self,
    SPK: SPK_pub_self,
    OPKs: publicOpksSelf,
  } = await getPreKeysByUserId(myUserId)
  const availableSelfOPK = publicOpksSelf.find((k) => !k.used) || publicOpksSelf[0]
  if (!availableSelfOPK) {
    throw new Error("❌ No hay OPKs disponibles para ti mismo")
  }
  const myOpkHash = await hashPublicKey(availableSelfOPK.publicKey)

  // Import all keys for self
  const keysSelf = await importAllKeys({
    IK_priv: privateKeys.IK,
    EK_priv,
    IK_pub: IK_pub_self,
    SPK_pub: SPK_pub_self,
    OPK_pub: availableSelfOPK.publicKey,
  })
  const K_AB_self = await deriveSharedSecret(keysSelf)
  const K_AB_self_b64 = toBase64(K_AB_self)
  console.log(`🔐 [CREATE] K_AB for self (Base64):`, K_AB_self_b64)
  const encryptedKey_self = await encryptKeyWithSharedSecret(kGroup, K_AB_self)

  deliveries.push({
    userId: myUserId,
    encryptedKey: encryptedKey_self,
    opkHash: myOpkHash,
  })

  // Enviamos al backend como prueba (entregas para todos los miembros)
  const response = await axios.post("group/groups", {
    name,
    memberIds,
    kGroupDeliveries: deliveries,
    ephemeralKey: exportedEphemeralKey, // esencial para que los demás deriven K_AB
  })

  console.log("🚀 Grupo enviado al backend:", response.data)
}

export const getUserGroups = async () => {
  const res = await axios.get(`group/groups`)
  return res.data
}

export const sendGroupMessage = async (groupId, content) => {
  const res = await axios.post(`group/messages/group/${groupId}`, {
    content,
  })
  return res.data
}

// Fetch the user's encrypted K_group for a group
export const getEncryptedGroupKey = async (groupId) => {
  const res = await axios.get(`group/groups/${groupId}/k_group`)
  return {
    encryptedKey: res.data.encryptedKey,
    ephemeralKey: res.data.ephemeralKey,
    opkUsed: res.data.opkUsed,
  }
}
