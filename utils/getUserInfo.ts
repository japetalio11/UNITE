export interface UserInfo {
  raw: any | null
  role: string | null
  isAdmin: boolean
  displayName: string | null
  email: string | null
}

function safeParse(raw: string | null) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch (e) { return null }
}

export function getUserInfo(): UserInfo {
  if (typeof window === 'undefined') return { raw: null, role: null, isAdmin: false, displayName: null, email: null }

  let raw: string | null = null
  try { raw = localStorage.getItem('unite_user') } catch (e) { raw = null }
  const parsed = safeParse(raw)
  // small console debug to help during development
  // NOTE: this prints the parsed user object to the browser console for debugging only
  try { console.debug('[getUserInfo] rawUser:', raw, 'parsedUser:', parsed) } catch (e) { /* ignore */ }

  // helper to search likely locations for a role field
  const searchPaths = [
    parsed,
    parsed?.user,
    parsed?.data,
    parsed?.staff,
    parsed?.staffData,
    parsed?.profile,
    parsed?.User,
    parsed?.result,
    parsed?.userInfo,
  ]

  const roleKeys = ['StaffType', 'Staff_Type', 'staff_type', 'staffType', 'role', 'Role', 'type', 'Type', 'role_name', 'RoleName']

  // collect all candidates across search paths so we can apply a priority
  const candidates: Array<{ value: any; key: string; pathIndex: number }> = []
  searchPaths.forEach((p, idx) => {
    if (!p) return
    for (const k of roleKeys) {
      if (Object.prototype.hasOwnProperty.call(p, k) && p[k] !== undefined && p[k] !== null) {
        candidates.push({ value: p[k], key: k, pathIndex: idx })
      }
    }
  })

  // prefer explicit StaffType-like keys over generic 'role'
  const staffLikeKeys = ['StaffType', 'Staff_Type', 'staff_type', 'staffType']
  let foundRole: any = null
  let foundPath: any = null

  // 1) pick first candidate whose key is staff-like
  const staffCandidate = candidates.find((c) => staffLikeKeys.includes(c.key))
  if (staffCandidate) {
    foundRole = staffCandidate.value
    foundPath = staffCandidate.key
  } else if (candidates.length) {
    // 2) otherwise pick the first discovered candidate
    foundRole = candidates[0].value
    foundPath = candidates[0].key
  }

  const role = foundRole ? String(foundRole).trim() : null
  try { console.debug('[getUserInfo] roleCandidates:', candidates, 'roleChosen:', role, 'fromKey:', foundPath) } catch (e) {}

  // Treat only system-admin style roles as admin (e.g. 'sysadmin', 'system_admin', 'system admin')
  // This avoids matching other roles that happen to include 'admin' as a substring.
  let isAdmin = false
  if (role) {
    const lower = String(role).toLowerCase()
    // require both 'sys' (or 'system') and 'admin' to be present in the role string
    isAdmin = /sys|system/.test(lower) && /admin/.test(lower)
  }

  // build display name like Campaign page: First + Middle + Last or fallback to name
  const first = parsed?.First_Name || parsed?.FirstName || parsed?.first_name || parsed?.first || parsed?.First || ''
  const middle = parsed?.Middle_Name || parsed?.MiddleName || parsed?.middle_name || parsed?.middle || parsed?.Middle || ''
  const last = parsed?.Last_Name || parsed?.LastName || parsed?.last_name || parsed?.last || parsed?.Last || ''
  const parts = [first, middle, last].map((p: any) => (p || '').toString().trim()).filter(Boolean)
  const displayName = parts.length ? parts.join(' ') : (parsed?.name || parsed?.Name || null)

  const email = parsed?.Email || parsed?.email || parsed?.Email_Address || parsed?.emailAddress || parsed?.EmailAddress || null

  return { raw: parsed || null, role, isAdmin, displayName: displayName || null, email: email || null }
}

export function isAdminUser(): boolean {
  return getUserInfo().isAdmin
}
