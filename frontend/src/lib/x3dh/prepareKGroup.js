import { getEncryptedGroupKey } from "@/api/user/group"
import { downloadEncryptedKey } from "@/utils/utils"

export const prepareKGroupForDecryption = async (
  groupId,
  setDialogGroupId,
  setDialogOpen
) => {
  if (!groupId || localStorage.getItem(`k_group_${groupId}`)) return

  try {
    const { encryptedKey, ephemeralKey, opkUsed } = await getEncryptedGroupKey(
      groupId
    )

    console.log(
      `🔑 Descargando K_group para el grupo ${groupId} con encryptedKey ${encryptedKey} y ephemeral ${ephemeralKey} y opkUsed ${opkUsed}`
    )

    downloadEncryptedKey(groupId, encryptedKey, ephemeralKey, opkUsed)
    setDialogGroupId(groupId)
    setDialogOpen(true)
  } catch (err) {
    console.error("❌ Error fetching encrypted K_group:", err)
  }
}
