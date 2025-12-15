"use client"

import { useEffect, useState } from "react"
import { Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"

interface EditStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  coordinator: any | null
  isSysAdmin?: boolean
  userDistrictId?: string | null
  onSaved?: () => void
  districtsProp?: any[]
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  coordinator,
  isSysAdmin = false,
  userDistrictId = null,
  onSaved,
  districtsProp = [],
}: EditStakeholderModalProps) {
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [organization, setOrganization] = useState("")
  const [cityMunicipality, setCityMunicipality] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  const [districts, setDistricts] = useState<any[]>([])
  const [districtId, setDistrictId] = useState<string | null>(null)
  const [province, setProvince] = useState<string>("")
  const [selectedProvince, setSelectedProvince] = useState<string>("")
  const [municipalities, setMunicipalities] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null)
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [accountType, setAccountType] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
  // preload districts if parent passed them and fetch provinces
  useEffect(() => {
    if (Array.isArray(districtsProp) && districtsProp.length > 0) {
      setDistricts(districtsProp)
    }

    const fetchProvinces = async () => {
      setProvincesLoading(true)
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base ? `${base}/api/locations/provinces` : `/api/locations/provinces`
        let token = null
        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }
        const headers: any = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null
        try {
          body = bodyText ? JSON.parse(bodyText) : null
        } catch {
          throw new Error("Invalid JSON from provinces endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch provinces (status ${res.status})`)
        const items = body.data || body || []
        setProvinces(Array.isArray(items) ? items : [])
      } catch (err: any) {
        // ignore; leave provinces empty
      } finally {
        setProvincesLoading(false)
      }
    }
    fetchProvinces()
  }, [districtsProp])

  // when a province id/name is available, try to resolve selectedProvinceId
  useEffect(() => {
    if (!provinces || provinces.length === 0) return
    const provKey = selectedProvince || province
    if (!provKey) return
    const match = provinces.find((p: any) => String(p.id) === String(provKey) || String(p._id) === String(provKey) || String(p.name) === String(provKey) || String(p.Province_Name) === String(provKey))
    if (match) setSelectedProvinceId(String(match.id || match._id || match.id))
  }, [provinces, selectedProvince, province])

  // Try to resolve districtId from loaded `districts` when possible (match by name or district id)
  useEffect(() => {
    if ((!districts || districts.length === 0) || districtId) return
    const coordDistrictCandidates = [
      coordinator?.District?.District_Name,
      coordinator?.District?.name,
      coordinator?.District_Name,
      coordinator?.districtName,
      coordinator?.District,
      coordinator?.district,
    ].filter(Boolean)
    if (coordDistrictCandidates.length === 0) return
    for (const cand of coordDistrictCandidates) {
      const found = districts.find((d: any) => {
        const name = String(d.District_Name || d.name || d.District || d.District_Number || d.District_ID || d.id || d._id)
        return String(name) === String(cand) || String(d.District_ID) === String(cand) || String(d._id) === String(cand) || String(d.id) === String(cand)
      })
      if (found) {
        setDistrictId(String(found._id || found.id || found.District_ID))
        break
      }
    }
  }, [districts, coordinator, districtId])

  // fetch districts for selected province if not provided
  useEffect(() => {
    const fetchDistrictsForProvince = async () => {
      if (!selectedProvinceId) return
      setDistrictsLoading(true)
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base
          ? `${base}/api/locations/provinces/${encodeURIComponent(selectedProvinceId)}/districts`
          : `/api/locations/provinces/${encodeURIComponent(selectedProvinceId)}/districts`
        let token = null
        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }
        const headers: any = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null
        try {
          body = bodyText ? JSON.parse(bodyText) : null
        } catch {
          throw new Error("Invalid JSON from districts endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch districts (status ${res.status})`)
        const items = body.data || body || []
        setDistricts(Array.isArray(items) ? items : [])
      } catch (err: any) {
        // ignore
      } finally {
        setDistrictsLoading(false)
      }
    }
    fetchDistrictsForProvince()
  }, [selectedProvinceId])

  // fetch municipalities for district
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (!districtId) {
        setMunicipalities([])
        return
      }
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base
          ? `${base}/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`
          : `/api/locations/districts/${encodeURIComponent(String(districtId))}/municipalities`
        let token = null
        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }
        const headers: any = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const res = await fetch(url, { headers })
        const bodyText = await res.text()
        let body: any = null
        try {
          body = bodyText ? JSON.parse(bodyText) : null
        } catch {
          throw new Error("Invalid JSON from municipalities endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch municipalities (status ${res.status})`)
        const items = body.data || body || []
        setMunicipalities(Array.isArray(items) ? items : [])
      } catch (err: any) {
        setMunicipalities([])
      }
    }
    loadMunicipalities()
  }, [districtId])

  // When municipalities load, try to resolve coordinator's municipality to an id so Select shows it
  useEffect(() => {
    if (!Array.isArray(municipalities) || municipalities.length === 0) return
    const coordMuniId = coordinator?.Municipality_ID || coordinator?.municipalityId || coordinator?.municipality || null
    const coordMuniName = coordinator?.City_Municipality || coordinator?.cityMunicipality || coordinator?.City || coordinator?.Municipality || null
    if (coordMuniId) {
      const found = municipalities.find((m: any) =>
        String(m._id || m.id || m.Municipality_ID || m.MunicipalityId) === String(coordMuniId),
      )
      if (found) {
        setCityMunicipality(String(found._id || found.id || found.Municipality_ID || found.MunicipalityId))
        return
      }
    }
    if (coordMuniName) {
      const found = municipalities.find((m: any) => {
        const name = String(m.name || m.Name || m.City_Municipality || m.City || m.CityMunicipality || m).toLowerCase()
        return name === String(coordMuniName).toLowerCase()
      })
      if (found) setCityMunicipality(String(found._id || found.id || found.Municipality_ID || found.MunicipalityId))
    }
  }, [municipalities, coordinator])

  useEffect(() => {
    if (isOpen && coordinator) {
      // Populate name fields
      setFirstName(coordinator.First_Name || coordinator.firstName || "")
      setMiddleName(coordinator.Middle_Name || coordinator.middleName || "")
      setLastName(coordinator.Last_Name || coordinator.lastName || "")

      // Populate contact information
      setEmail(coordinator.Email || coordinator.email || "")
      setPhoneNumber(coordinator.Phone_Number || coordinator.phoneNumber || "")

      // Populate organization from multiple possible shapes (mirror page resolution)
      const resolveOrg = (() => {
        const s: any = coordinator || {}
        const tryValues = [
          s.Organization_Institution,
          s.Organization,
          s.organization,
          s.OrganizationName,
          s.Organization_Name,
            s.organization_institution,
            s.organizationInstitution,
          s.Organisation,
          s.organisation,
          s.OrganizationInstitution,
          s.data && s.data.Organization_Institution,
          s.data && s.data.organization,
          s.stakeholder && s.stakeholder.Organization_Institution,
          s.stakeholder && s.stakeholder.organization,
          s.result && s.result.Organization_Institution,
          s.details && s.details.Organization_Institution,
        ]
        for (const v of tryValues) {
          if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim()
        }
        for (const k of Object.keys(s || {})) {
          const key = String(k).toLowerCase()
          if (key.includes("organ") || key.includes("institut") || key.includes("organisation")) {
            const v = s[k]
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim()
          }
        }
        return ""
      })()
      setOrganization(resolveOrg)
      setCityMunicipality(
        coordinator.City_Municipality || coordinator.cityMunicipality || coordinator.City || coordinator.Municipality || coordinator.Municipality_Name || "",
      )


      // Populate province and district (support multiple shapes)
      let provName = ""
      if (coordinator.Province_Name) provName = coordinator.Province_Name
      else if (coordinator.province) provName = coordinator.province
      else if (coordinator.Province) {
        if (typeof coordinator.Province === "string") provName = coordinator.Province
        else provName = coordinator.Province.Province_Name || coordinator.Province.name || coordinator.Province.province || ""
      }
      setProvince(provName)
      setSelectedProvince(provName)

      const distId =
        coordinator.District_ID || coordinator.districtId || coordinator.District?.District_ID || coordinator.District?.id || coordinator.District?._id || null
      setDistrictId(distId ? String(distId) : null)

      // Try to pick a municipality id if present on the coordinator (prefer ids over names)
      const muniId =
        coordinator.Municipality_ID || coordinator.municipalityId || coordinator.municipality || coordinator.Municipality || null
      if (muniId) setCityMunicipality(String(muniId))

      // Populate account type (assignment)
      setAccountType(coordinator.Account_Type || coordinator.accountType || null)

      // Clear password field for edit mode
      setNewPassword("")

      // Clear validation errors
      setValidationErrors([])
    }
  }, [isOpen, coordinator])

  // Accept districtsProp and preload provinces/districts similar to AddStakeholderModal
  useEffect(() => {
    // @ts-ignore
    const propsAny: any = ({} as any)
    try {
      // read via the actual variable name from the outer scope
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } catch (e) {
      /* noop */
    }
  }, [])

  const handleSave = async () => {
    if (!coordinator) return

    setIsSubmitting(true)
    setValidationErrors([])

    try {
      const coordId = coordinator.Stakeholder_ID || coordinator.StakeholderId || coordinator.id || coordinator._id
      if (!coordId) throw new Error("Stakeholder id not available")

      const token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
      const headers: any = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const payload: any = {}
      if (firstName) payload.First_Name = firstName
      if (middleName !== undefined) payload.Middle_Name = middleName
      if (lastName) payload.Last_Name = lastName
      if (email) payload.Email = email
      if (phoneNumber) payload.Phone_Number = phoneNumber
      // Only sysadmin may change province/district/accountType
      if (isSysAdmin) {
        if (districtId) payload.District_ID = districtId
        payload.Province_Name = (selectedProvince || province) as any
      }
      if (organization !== undefined) payload.Organization_Institution = organization || null
      if (cityMunicipality !== undefined) payload.City_Municipality = cityMunicipality || null

      if (newPassword && String(newPassword).trim().length > 0) {
        payload.Password = newPassword
        payload.password = newPassword
      }

      if (isSysAdmin && districtId) payload.district = districtId
      if (cityMunicipality !== undefined) payload.municipality = cityMunicipality || null

      // Account type (assignment) only editable by sysadmin
      if (isSysAdmin && (accountType !== undefined && accountType !== null)) {
        payload.Account_Type = accountType || null
        payload.accountType = accountType || null
      }

      const res = await fetch(`${API_URL}/api/stakeholders/${coordId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      let resp: any = null
      try {
        resp = JSON.parse(text)
      } catch (e) {
        resp = { message: text }
      }

      if (!res.ok) {
        if (resp && resp.errors && Array.isArray(resp.errors)) {
          setValidationErrors(resp.errors)
          return
        }
        throw new Error(resp.message || "Failed to update stakeholder")
      }

      if (onSaved) {
        try {
          await onSaved()
        } catch (e) {
          // ignore onSaved errors but continue to close/reload
        }
      }

      onClose()
      // Force a full reload so the stakeholder page always refreshes to latest data
      if (typeof window !== "undefined") {
        try {
          window.location.reload()
        } catch (e) {
          // ignore reload errors
        }
      }
    } catch (err: any) {
      setValidationErrors([err?.message || "Failed to save changes"])
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!coordinator) return null

  // ... existing code for displayedProvinceName and displayedDistrictName ...
  const displayedProvinceName = (() => {
    const provKey = selectedProvince || province || null
    if (!provKey) return ""

    // If selectedProvince is a readable name (not an ObjectId), prefer it
    if (typeof provKey === "string" && !String(provKey).match(/^[0-9a-fA-F]{24}$/)) {
      // Try to find a district that references this province to get a nicer name
      const pick = districts.find(
        (d) =>
          String(d.Province_Name) === String(provKey) ||
          String(d.Province) === String(provKey) ||
          String(d.province) === String(provKey),
      )
      if (pick) return pick.Province_Name || pick.Province || pick.province || String(provKey)
      return String(provKey)
    }

    // If provKey looks like an ObjectId (or numeric id), try to resolve against loaded provinces
    const keyStr = String(provKey)
    const idLike = keyStr.match(/^[0-9a-fA-F]{24}$/)
    if (idLike) {
      // Look for common fields in province objects
      const pmatch = provinces.find((p: any) =>
        String(p._id) === keyStr || String(p.id) === keyStr || String(p.Province_ID || "") === keyStr,
      )
      if (pmatch) {
        if (!selectedProvinceId) setSelectedProvinceId(String(pmatch._id || pmatch.id))
        return pmatch.name || pmatch.Province_Name || String(pmatch._id || pmatch.id)
      }

      // Last resort: search districts for a province mapping
      if (districts && districts.length > 0) {
        const pick = districts.find(
          (d) =>
            String(d.Province) === keyStr ||
            String(d.Province_ID) === keyStr ||
            (d.Province && String(d.Province._id) === keyStr) ||
            String(d._id) === keyStr ||
            String(d.id) === keyStr,
        )
        if (pick) return pick.Province_Name || pick.Province || pick.province || keyStr
      }
    }

    // If provKey is an object (may come from coordinator.Province), try common name fields
    if (typeof provKey === "object") {
      const p = provKey as any
      return p.Province_Name || p.name || p.Province || String(p._id || p.id || "")
    }

    // Fallback: return stringified key
    return String(provKey)
  })()

  const displayedDistrictName = (() => {
    const pick = districts.find(
      (d) =>
        String(d.District_ID) === String(districtId) ||
        String(d._id) === String(districtId) ||
        String(d.id) === String(districtId),
    )
    if (pick) return pick.District_Name || pick.District || pick.name || String(districtId || "")
    if (coordinator.District)
      return coordinator.District.District_Name || coordinator.District.name || coordinator.District.District_ID || ""
    return districtId ? String(districtId) : ""
  })()

  return (
    <Modal isOpen={isOpen} placement="center" scrollBehavior="inside" size="xl" onClose={onClose}>
      <ModalContent className="max-w-2xl rounded-lg">
        <ModalHeader className="flex flex-col gap-0 pb-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                  stroke="#333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"
                  stroke="#333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Edit Stakeholder</h2>
              <p className="text-sm text-gray-600 mt-1">
                Please review and update the stakeholder's information below.
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="py-0 pb-6">
          <div className="space-y-6">
            {/* Stakeholder Name Section */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-3 block">
                Stakeholder Name <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="First name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={firstName}
                  variant="bordered"
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  placeholder="Middle name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={middleName}
                  variant="bordered"
                  onChange={(e) => setMiddleName(e.target.value)}
                />
                <Input
                  placeholder="Last name"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={lastName}
                  variant="bordered"
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Stakeholder Email */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Stakeholder Email <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter stakeholder email"
                classNames={{ inputWrapper: "h-10" }}
                type="email"
                value={email}
                variant="bordered"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter contact number"
                classNames={{ inputWrapper: "h-10" }}
                type="tel"
                value={phoneNumber}
                variant="bordered"
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* Password Fields */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Password <span className="text-gray-500 text-xs">(leave blank to keep current)</span>
              </label>
              <Input
                placeholder="Leave blank to keep current password"
                classNames={{ inputWrapper: "h-10" }}
                endContent={
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? (
                      <Eye className="text-gray-600 pointer-events-none w-5 h-5" />
                    ) : (
                      <EyeOff className="text-gray-600 pointer-events-none w-5 h-5" />
                    )}
                  </button>
                }
                type={showPassword ? "text" : "password"}
                value={newPassword}
                variant="bordered"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Account Type</label>
              <Select
                placeholder={isSysAdmin ? "Choose Account Type" : "Account type (view only)"}
                selectedKeys={accountType ? [String(accountType)] : []}
                disabled={!isSysAdmin}
                onSelectionChange={(keys: any) => {
                  const v = Array.from(keys)[0] as string
                  setAccountType(v || null)
                }}
              >
                <SelectItem key="LGU" textValue="LGU">LGU</SelectItem>
                <SelectItem key="Others" textValue="Others">Others</SelectItem>
              </Select>
            </div>

            {/* Province and District */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Province</label>
                {isSysAdmin ? (
                  <Select
                    placeholder="Choose Province"
                    selectedKeys={selectedProvinceId ? [String(selectedProvinceId)] : []}
                    onSelectionChange={(keys: any) => {
                      const id = Array.from(keys)[0] as string
                      const match = provinces.find((p) =>
                        String(p.id) === String(id) || String(p._id) === String(id) || String(p.name) === String(id) || String(p.Province_Name) === String(id),
                      )
                      if (match) {
                        setSelectedProvinceId(String(match.id || match._id))
                        setSelectedProvince(match.name || match.Province_Name || String(match.id || match._id))
                        setDistrictId(null)
                      }
                    }}
                  >
                    {(provinces || []).map((p: any, idx: number) => {
                      const key = String(p.id ?? p._id ?? p._id ?? p.name ?? idx)
                      const label = String(p.name || p.Province_Name || p.name || p.Province || key)
                      return (
                        <SelectItem key={key} textValue={label}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </Select>
                ) : (
                  <Input
                    disabled
                    classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                    type="text"
                    value={displayedProvinceName || province}
                    variant="bordered"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">District</label>
                <Select
                  disabled={!isSysAdmin}
                  placeholder="Choose District"
                  selectedKeys={districtId ? [String(districtId)] : []}
                  onSelectionChange={(keys: any) => {
                    const id = Array.from(keys)[0] as string
                    setDistrictId(id)
                    setCityMunicipality("")
                    const pick = districts.find(
                      (d) =>
                        String(d.District_ID) === String(id) ||
                        String(d.id) === String(id) ||
                        String(d._id) === String(id),
                    )
                    if (pick) {
                      setProvince(pick.Province_Name || pick.Province || pick.province || "")
                      setSelectedProvince(pick.Province_Name || pick.Province || pick.province || "")
                      const provId =
                        pick.Province_ID ||
                        pick.ProvinceId ||
                        (pick.Province && (pick.Province._id || pick.Province.id)) ||
                        null
                      if (provId) setSelectedProvinceId(String(provId))
                    }
                  }}
                >
                  {(() => {
                    const list = (() => {
                      if (selectedProvinceId && Array.isArray(districts) && districts.length > 0) {
                        return districts
                      }
                      const provName = (() => {
                        if (selectedProvince) return selectedProvince
                        if (selectedProvinceId) {
                          const p = provinces.find((x) => String(x.id) === String(selectedProvinceId))
                          if (p) return p.name
                        }
                        if (province) return province
                        return null
                      })()
                      return (districts || []).filter((d) =>
                        provName
                          ? d.Province_Name === provName || d.Province === provName || d.province === provName
                          : true,
                      )
                    })()
                    if (list.length > 0) {
                      return list.map((d, idx) => {
                        const label =
                          d.name || d.District_Name || d.District || d.District_Number || d.District_ID || String(idx)
                        const key = String(d._id || d.id || d.District_ID || idx)
                        return (
                          <SelectItem key={key} textValue={String(label)}>
                            {String(label)}
                          </SelectItem>
                        )
                      })
                    }
                    if (districtId || coordinator.District) {
                      return (
                        <SelectItem
                          key={String(
                            districtId ||
                              (coordinator.District &&
                                (coordinator.District.District_ID ||
                                  coordinator.District._id ||
                                  coordinator.District.id)),
                          )}
                          textValue={String(displayedDistrictName)}
                        >
                          {String(displayedDistrictName)}
                        </SelectItem>
                      )
                    }
                    return null
                  })()}
                </Select>
              </div>
            </div>

            {/* Municipality and Organization */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Municipality / City</label>
                <Select
                  placeholder="Choose Municipality / City"
                  selectedKeys={cityMunicipality ? [String(cityMunicipality)] : []}
                  onSelectionChange={(keys: any) => {
                    const v = Array.from(keys)[0] as string
                    setCityMunicipality(v || "")
                  }}
                >
                  {municipalities && municipalities.length > 0 ? (
                    municipalities.map((m: any, idx: number) => {
                      const label = m.name || m.Name || m.City_Municipality || String(m)
                      const key = String(m._id || m.id || label || idx)
                      return (
                        <SelectItem key={key} textValue={String(label)}>
                          {String(label)}
                        </SelectItem>
                      )
                    })
                  ) : cityMunicipality ? (
                    <SelectItem key={String(cityMunicipality)} textValue={String(cityMunicipality)}>
                      {String(cityMunicipality)}
                    </SelectItem>
                  ) : null}
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">Organization / Institution</label>
                <Input
                  placeholder="Enter Organization / Institution"
                  classNames={{ inputWrapper: "h-10" }}
                  type="text"
                  value={organization}
                  variant="bordered"
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>

            

            {/* Validation Errors */}
            {validationErrors && validationErrors.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="text-sm font-semibold text-red-900">Validation error</h4>
                <ul className="text-xs mt-2 list-disc list-inside text-red-800">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="gap-3">
          <Button variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button className="bg-black text-white" disabled={isSubmitting} onPress={handleSave}>
            {isSubmitting ? "Saving..." : "Edit Stakeholder"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
