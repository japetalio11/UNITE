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
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  coordinator,
  isSysAdmin = false,
  userDistrictId = null,
  onSaved,
}: EditStakeholderModalProps) {
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [organization, setOrganization] = useState("")
  const [cityMunicipality, setCityMunicipality] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

  useEffect(() => {
    if (isOpen && coordinator) {
      // Populate name fields
      setFirstName(coordinator.First_Name || coordinator.firstName || "")
      setMiddleName(coordinator.Middle_Name || coordinator.middleName || "")
      setLastName(coordinator.Last_Name || coordinator.lastName || "")

      // Populate contact information
      setEmail(coordinator.Email || coordinator.email || "")
      setPhoneNumber(coordinator.Phone_Number || coordinator.phoneNumber || "")

      // Populate organization and location
      setOrganization(coordinator.Organization_Institution || coordinator.organization || "")
      setCityMunicipality(coordinator.City_Municipality || coordinator.cityMunicipality || "")

      // Populate province and district
      const provName = coordinator.Province_Name || coordinator.province || ""
      setProvince(provName)
      setSelectedProvince(provName)

      const distId = coordinator.District_ID || coordinator.districtId || coordinator.district?.id || null
      setDistrictId(distId ? String(distId) : null)

      // Clear password fields for edit mode
      setNewPassword("")
      setConfirmPassword("")

      // Clear validation errors
      setValidationErrors([])
    }
  }, [isOpen, coordinator])

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
      if (isSysAdmin && districtId) payload.District_ID = districtId
      payload.Province_Name = (selectedProvince || province) as any
      if (organization !== undefined) payload.Organization_Institution = organization || null
      if (cityMunicipality !== undefined) payload.City_Municipality = cityMunicipality || null

      if (newPassword && String(newPassword).trim().length > 0) {
        if (newPassword !== confirmPassword) {
          setValidationErrors(["Passwords do not match"])
          setIsSubmitting(false)
          return
        }
        payload.Password = newPassword
        payload.password = newPassword
      }

      if (isSysAdmin && districtId) payload.district = districtId
      if (cityMunicipality !== undefined) payload.municipality = cityMunicipality || null

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
    if (selectedProvince && !String(selectedProvince).match(/^[0-9a-fA-F]{24}$/)) {
      const pick = districts.find(
        (d) =>
          String(d.Province_Name) === String(selectedProvince) ||
          String(d.Province) === String(selectedProvince) ||
          String(d.province) === String(selectedProvince),
      )
      if (pick) return pick.Province_Name || pick.Province || pick.province || String(selectedProvince)
      return String(selectedProvince)
    }
    if (province) {
      const objIdLike = String(province).match(/^[0-9a-fA-F]{24}$/)
      if (objIdLike) {
        const pmatch = provinces.find((p) => String(p.id) === String(province))
        if (pmatch) {
          if (!selectedProvinceId) setSelectedProvinceId(String(pmatch.id))
          return pmatch.name || String(pmatch.id)
        }
        if (districts && districts.length > 0) {
          const pick = districts.find(
            (d) =>
              String(d.Province) === String(province) ||
              String(d.Province_ID) === String(province) ||
              (d.Province && String(d.Province._id) === String(province)) ||
              String(d._id) === String(province) ||
              String(d.id) === String(province),
          )
          if (pick) return pick.Province_Name || pick.Province || pick.province || String(province)
        }
      }
      return String(province)
    }
    return ""
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
                Set Password <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Set password"
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
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Retype Password <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter contact number"
                classNames={{ inputWrapper: "h-10" }}
                endContent={
                  <button
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                  >
                    {showConfirmPassword ? (
                      <Eye className="text-gray-600 pointer-events-none w-5 h-5" />
                    ) : (
                      <EyeOff className="text-gray-600 pointer-events-none w-5 h-5" />
                    )}
                  </button>
                }
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                variant="bordered"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
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
                      const match = provinces.find((p) => String(p.id) === String(id))
                      if (match) {
                        setSelectedProvinceId(String(match.id))
                        setSelectedProvince(match.name || String(match.id))
                        setDistrictId(null)
                      }
                    }}
                  >
                    {(provinces || []).map((p: any) => (
                      <SelectItem key={String(p.id)} textValue={String(p.name)}>
                        {String(p.name)}
                      </SelectItem>
                    ))}
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
