// Which conversation is on screen, if any. The Messages screen sets it; the
// notification bell reads it, so it does not count or announce messages the user
// is already looking at (that screen announces them itself and marks them read).
let openId: string | null = null

export const setOpenConversation = (id: string | null) => { openId = id }
export const getOpenConversation = () => openId
