"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Persons as Users, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"
import { getUserInfo } from "@/utils/getUserInfo"

interface AddStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isSubmitting?: boolean
  isSysAdmin?: boolean
  userDistrictId?: string | null
  districtsProp?: any[]
  modalError?: string | null
  onClearError?: () => void
}

export default function AddStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  isSysAdmin = false,
  userDistrictId = null,
  districtsProp = undefined,
  modalError = null,
  onClearError = undefined,
}: AddStakeholderModalProps) {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("")
  const [provinces, setProvinces] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("")
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [districtsError, setDistrictsError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showRetypePassword, setShowRetypePassword] = useState(false)
  const [cityInput, setCityInput] = useState<string>("")
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>("")
  const [municipalities, setMunicipalities] = useState<any[]>([])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const firstName = (formData.get("firstName") || "").toString()
    const middleName = (formData.get("middleName") || "").toString()
    const lastName = (formData.get("lastName") || "").toString()

    let resolvedMunicipalityId: string | null = selectedMunicipalityId || null
    const cityLabel = (formData.get("cityMunicipality") as string) || cityInput || ""

    if (!resolvedMunicipalityId && selectedDistrictId) {
      try {
        const found = (municipalities || []).find((m: any) => {
          const name = String(m.name || m.Name || m.City_Municipality || m.City || m).toLowerCase()
          return name === String(cityLabel || "").toLowerCase()
        })
        if (found)
          resolvedMunicipalityId = String(found._id || found.id || found.Municipality_ID || found.MunicipalityId || "")
      } catch (e) {
        // ignore
      }
    }

    if (selectedDistrictId && !resolvedMunicipalityId) {
      if (onClearError) onClearError()
      const msg = "Please select a City / Municipality from the list for the chosen District."
      ;(e.currentTarget as HTMLFormElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      try {
        // if parent exposes a setter via onClearError we already called it to clear previous
      } catch (err) {
        /* noop */
      }
      alert(msg)
      return
    }

    const data: any = {
      firstName,
      middleName,
      lastName,
      stakeholderName: [firstName, middleName, lastName].filter(Boolean).join(" "),
      stakeholderEmail: formData.get("coordinatorEmail") as string,
      contactNumber: formData.get("contactNumber") as string,
      organization: (formData.get("organization") as string) || "",
      password: formData.get("password") as string,
      retypePassword: formData.get("retypePassword") as string,
      province: (formData.get("province") as string) || computedProvince || "",
      district: formData.get("district") as string,
      districtId: selectedDistrictId,
      cityMunicipality: formData.get("cityMunicipality") as string,
      municipality: resolvedMunicipalityId,
    }

    if (data.password !== data.retypePassword) {
      alert("Passwords do not match!")
      return
    }

    onSubmit(data)
  }

  const handleProvinceChange = (keys: any) => {
    const provinceId = Array.from(keys)[0] as string
    setSelectedProvinceId(provinceId)
    setSelectedDistrictId("")
    setMunicipalities([])
    setCityInput("")
  }

  const computedProvince =
    provinces.find((p) => String(p._id || p.id) === String(selectedProvinceId))?.name ||
    districts.find((d) => String(d.District_ID) === String(selectedDistrictId))?.Province_Name ||
    ""

  const ordinalSuffix = (n: number | string) => {
    const num = Number(n)
    if (Number.isNaN(num)) return String(n)
    const j = num % 10,
      k = num % 100
    if (j === 1 && k !== 11) return `${num}st`
    if (j === 2 && k !== 12) return `${num}nd`
    if (j === 3 && k !== 13) return `${num}rd`
    return `${num}th`
  }

  const formatDistrict = (d: any) => {
    if (!d) return ""
    if (d.District_Number) return `${ordinalSuffix(d.District_Number)} District`
    if (d.District_Name) return d.District_Name
    return String(d.District_ID || "")
  }

  const getDistrictLabel = (d: any, idx: number) => {
    if (!d) return String(idx)
    if (typeof d === "string") return String(d)
    const maybeName =
      d.District_Name || d.DistrictName || d.name || d.Name || (d.District_Number ? formatDistrict(d) : null)
    if (maybeName) return String(maybeName)
    return String(d.District_ID || d._id || d.id || idx)
  }

  useEffect(() => {
    if (!districts || districts.length === 0) return
    const missing = districts.filter((d) => {
      if (!d) return false
      if (typeof d === "string") return true
      return !(d.District_Name || d.name || d.District_Number || d.District_ID || d._id || d.id)
    })
    if (missing.length === 0) return
    const ids = Array.from(
      new Set(missing.map((d) => (typeof d === "string" ? d : d.District_ID || d._id || d.id)).filter(Boolean)),
    )
    if (ids.length === 0) return
    ;(async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        let token = null
        try {
          token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
        } catch (e) {
          token = null
        }
        const headers: any = {}
        if (token) headers["Authorization"] = `Bearer ${token}`
        const fetches = ids.map((id) => {
          const url = base
            ? `${base}/api/districts/${encodeURIComponent(id)}`
            : `/api/districts/${encodeURIComponent(id)}`
          return fetch(url, { headers })
            .then((r) => r.text())
            .then((t) => {
              try {
                return t ? JSON.parse(t) : null
              } catch {
                return null
              }
            })
            .catch(() => null)
        })
        const results = await Promise.all(fetches)
        const fetched = results
          .map((r) => r?.data || r || null)
          .filter(Boolean)
          .map((r) => (Array.isArray(r) && r.length === 1 ? r[0] : r))
        if (fetched.length === 0) return
        setDistricts((prev) =>
          prev.map((d) => {
            const id = typeof d === "string" ? d : d.District_ID || d._id || d.id
            const found = fetched.find((f: any) => String(f.District_ID || f._id || f.id) === String(id))
            return found || d
          }),
        )
      } catch (e) {
        // ignore network errors
      }
    })()
  }, [districts])

  const districtObj = districts.find((x) => String(x.District_ID) === String(selectedDistrictId)) || null
  let districtLabel = ""
  if (districtObj) {
    districtLabel = formatDistrict(districtObj)
  } else if (selectedDistrictId) {
    const m = String(selectedDistrictId).match(/(\d+)$/)
    if (m) {
      const num = Number(m[1])
      if (!Number.isNaN(num)) districtLabel = `${ordinalSuffix(num)} District`
      else districtLabel = String(selectedDistrictId)
    } else {
      districtLabel = String(selectedDistrictId)
    }
  }

  const computedCity =
    (districtObj && (districtObj.City_Municipality || districtObj.City || districtObj.CityMunicipality)) || ""

  useEffect(() => {
    setCityInput(computedCity || "")
  }, [computedCity])

  useEffect(() => {
    if (Array.isArray(districtsProp) && districtsProp.length > 0) {
      setDistricts(districtsProp)
    }
    const fetchProvinces = async () => {
      setDistrictsLoading(true)
      setDistrictsError(null)
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
        setDistrictsError(err.message || "Failed to load provinces")
      } finally {
        setDistrictsLoading(false)
      }
    }
    fetchProvinces()
  }, [])

  useEffect(() => {
    const fetchDistrictsForProvince = async () => {
      if (!selectedProvinceId) {
        setDistricts([])
        return
      }
      setDistrictsLoading(true)
      setDistrictsError(null)
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
          throw new Error("Invalid JSON from districts-by-province endpoint")
        }
        if (!res.ok) throw new Error(body?.message || `Failed to fetch districts (status ${res.status})`)
        const items = body.data || body || []
        setDistricts(Array.isArray(items) ? items : [])
      } catch (err: any) {
        setDistrictsError(err.message || "Failed to load districts")
      } finally {
        setDistrictsLoading(false)
      }
    }
    fetchDistrictsForProvince()
  }, [selectedProvinceId])

  useEffect(() => {
    const loadMunicipalities = async () => {
      if (!selectedDistrictId) {
        setMunicipalities([])
        return
      }
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
        const url = base
          ? `${base}/api/locations/districts/${encodeURIComponent(selectedDistrictId)}/municipalities`
          : `/api/locations/districts/${encodeURIComponent(selectedDistrictId)}/municipalities`
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
          body = null
        }
        const items = (body && (body.data || body)) || []
        setMunicipalities(Array.isArray(items) ? items : [])
      } catch (e) {
        setMunicipalities([])
      }
    }
    loadMunicipalities()
  }, [selectedDistrictId])

  useEffect(() => {
    if (!isSysAdmin && userDistrictId) {
      setSelectedDistrictId(String(userDistrictId))
      const d = districts.find((x) => String(x.District_ID) === String(userDistrictId))
      if (d) {
        const provId = d.Province_ID || d.ProvinceId || d.province || d.provinceId || d.province_id || null
        if (provId) setSelectedProvinceId(String(provId))
        else {
          const prov = provinces.find((p) => (p.name || p.Province_Name) === (d.Province_Name || d.ProvinceName))
          if (prov) setSelectedProvinceId(String(prov._id || prov.id))
        }
      }
      return
    }
    if (!isSysAdmin && !userDistrictId) {
      let uid: any = null
      let parsed: any = null
      let info: any = null
      try {
        info = getUserInfo()
        if (info && info.raw) {
          const r = info.raw
          uid =
            r?.District_ID ||
            r?.DistrictId ||
            r?.districtId ||
            r?.district_id ||
            (r?.role_data && (r.role_data.district_id || r.role_data.districtId || r.role_data.district)) ||
            null
        }
      } catch (e) {
        /* ignore */
      }
      if (!uid) {
        try {
          const raw = localStorage.getItem("unite_user") || sessionStorage.getItem("unite_user")
          parsed = raw ? JSON.parse(raw) : null
        } catch (e) {
          parsed = null
        }
        const p = parsed || {}
        uid =
          p?.District_ID ||
          p?.DistrictId ||
          p?.districtId ||
          p?.district_id ||
          (p?.role_data && (p.role_data.district_id || p.role_data.districtId || p.role_data.district)) ||
          (p?.user && (p.user.District_ID || p.user.DistrictId || p.user.districtId || p.user.district_id)) ||
          null
        if (!uid && !isSysAdmin) {
          const infoId = info?.raw?.id || info?.raw?.ID || parsed?.id || parsed?.ID || null
          if (infoId) {
            ;(async () => {
              try {
                const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
                const isCoordinatorId =
                  String(infoId).toLowerCase().startsWith("coord_") ||
                  String(info?.raw?.role || "")
                    .toLowerCase()
                    .includes("coordinator")
                const url = base
                  ? isCoordinatorId
                    ? `${base}/api/coordinators/${encodeURIComponent(infoId)}`
                    : `${base}/api/stakeholders/${encodeURIComponent(infoId)}`
                  : isCoordinatorId
                    ? `/api/coordinators/${encodeURIComponent(infoId)}`
                    : `/api/stakeholders/${encodeURIComponent(infoId)}`
                let token = null
                try {
                  token = localStorage.getItem("unite_token") || sessionStorage.getItem("unite_token")
                } catch (e) {
                  token = null
                }
                const headers: any = {}
                if (token) headers["Authorization"] = `Bearer ${token}`
                const res = await fetch(url, { headers })
                const txt = await res.text()
                let j: any = null
                try {
                  j = txt ? JSON.parse(txt) : null
                } catch (e) {
                  j = null
                }
                const rec = j?.data || j?.stakeholder || j || null
                if (rec) {
                  const foundUid =
                    rec?.District_ID ||
                    rec?.district_id ||
                    rec?.DistrictId ||
                    (rec?.role_data &&
                      (rec.role_data.district_id || rec.role_data.districtId || rec.role_data.district)) ||
                    (rec?.District && (rec.District.District_ID || rec.District.DistrictId)) ||
                    null
                  if (foundUid) {
                    uid = foundUid
                    const d = districts.find((x) => String(x.District_ID) === String(uid))
                    if (d) {
                      const provId =
                        d.Province_ID || d.ProvinceId || d.province || d.provinceId || d.province_id || null
                      if (provId) setSelectedProvinceId(String(provId))
                      else {
                        const prov = provinces.find(
                          (p) => (p.name || p.Province_Name) === (d.Province_Name || d.ProvinceName),
                        )
                        if (prov) setSelectedProvinceId(String(prov._id || prov.id))
                      }
                    }
                    setSelectedDistrictId(String(uid))
                  }
                }
              } catch (e) {
                // ignore network errors here
              }
            })()
          }
        }
      }
      if (uid) {
        setSelectedDistrictId(String(uid))
        const d = districts.find((x) => String(x.District_ID) === String(uid))
        if (d) {
          const provId = d.Province_ID || d.ProvinceId || d.province || d.provinceId || d.province_id || null
          if (provId) setSelectedProvinceId(String(provId))
          else {
            const prov = provinces.find((p) => (p.name || p.Province_Name) === (d.Province_Name || d.ProvinceName))
            if (prov) setSelectedProvinceId(String(prov._id || prov.id))
          }
        }
      }
    }
  }, [isSysAdmin, userDistrictId, districts])

  return (
    <Modal
      classNames={{
        base: "max-h-[95vh] w-full max-w-2xl",
        body: "py-6",
      }}
      isOpen={isOpen}
      placement="center"
      scrollBehavior="inside"
      size="lg"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-2 pb-3 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-100">
                  <Users className="w-4 h-4 text-gray-700" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Add Stakeholder</h2>
              </div>
              <p className="text-sm font-normal text-gray-500">
                Please enter the stakeholder's information below to add them to the system.
              </p>
            </ModalHeader>
            <ModalBody className="gap-4 px-6 py-6 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <span>{modalError}</span>
                    <button
                      className="ml-3 text-xs font-medium text-red-600 hover:text-red-800 whitespace-nowrap"
                      type="button"
                      onClick={() => {
                        if (onClearError) onClearError()
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="First name"
                    name="firstName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Middle name"
                    name="middleName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                  <Input
                    isRequired
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Last name"
                    name="lastName"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Stakeholder Email <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter stakeholder email"
                  name="coordinatorEmail"
                  radius="md"
                  size="md"
                  type="email"
                  variant="bordered"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  placeholder="Enter contact number"
                  name="contactNumber"
                  radius="md"
                  size="md"
                  type="tel"
                  variant="bordered"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Set Password <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  endContent={
                    <button className="focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  }
                  placeholder="Set password"
                  name="password"
                  radius="md"
                  size="md"
                  type={showPassword ? "text" : "password"}
                  variant="bordered"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  Retype Password <span className="text-red-500">*</span>
                </label>
                <Input
                  isRequired
                  classNames={{
                    inputWrapper: "border-gray-300",
                  }}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowRetypePassword(!showRetypePassword)}
                    >
                      {showRetypePassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  }
                  placeholder="Retype password"
                  name="retypePassword"
                  radius="md"
                  size="md"
                  type={showRetypePassword ? "text" : "password"}
                  variant="bordered"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Province</label>
                  {isSysAdmin ? (
                    <Select
                      classNames={{
                        trigger: "border-gray-300",
                      }}
                      placeholder={provinces.length === 0 ? "Loading..." : "Choose Province"}
                      name="province"
                      radius="md"
                      selectedKeys={selectedProvinceId ? new Set([String(selectedProvinceId)]) : new Set()}
                      size="md"
                      variant="bordered"
                      onSelectionChange={(keys: any) => handleProvinceChange(keys)}
                    >
                      {provinces.map((p) => (
                        <SelectItem
                          key={String(p._id || p.id)}
                          textValue={String(p.name || p.Province_Name || p.label)}
                        >
                          {String(p.name || p.Province_Name || p.label)}
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="province"
                      placeholder="Province"
                      radius="md"
                      size="md"
                      type="text"
                      value={computedProvince}
                      variant="bordered"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">District</label>
                  {isSysAdmin ? (
                    selectedProvinceId ? (
                      <Select
                        classNames={{
                          trigger: "border-gray-300",
                        }}
                        placeholder={districtsLoading ? "Loading..." : "Choose District"}
                        name="district"
                        radius="md"
                        selectedKeys={selectedDistrictId ? new Set([String(selectedDistrictId)]) : new Set()}
                        size="md"
                        variant="bordered"
                        onSelectionChange={(keys: any) => {
                          const id = Array.from(keys)[0] as string
                          setSelectedDistrictId(String(id))
                          const d = districts.find(
                            (x) =>
                              String(x.District_ID) === String(id) ||
                              String(x._id) === String(id) ||
                              String(x.id) === String(id),
                          )
                          if (d) {
                            const provId =
                              d.Province_ID || d.ProvinceId || d.province || d.provinceId || d.province_id || null
                            if (provId) setSelectedProvinceId(String(provId))
                            else {
                              const prov = provinces.find(
                                (p) => (p.name || p.Province_Name) === (d.Province_Name || d.ProvinceName),
                              )
                              if (prov) setSelectedProvinceId(String(prov._id || prov.id))
                            }
                          }
                        }}
                      >
                        {districts
                          .filter((d) =>
                            selectedProvinceId
                              ? String(d.Province_ID || d.ProvinceId || d.province || d.provinceId) ===
                                String(selectedProvinceId)
                              : true,
                          )
                          .map((district, idx) => {
                            const label = getDistrictLabel(district, idx)
                            const key = String(district.District_ID || district._id || district.id || idx)
                            return (
                              <SelectItem key={key} textValue={String(label)}>
                                {String(label)}
                              </SelectItem>
                            )
                          })}
                      </Select>
                    ) : (
                      <Input
                        disabled
                        classNames={{
                          inputWrapper: "border-gray-300 bg-gray-50",
                        }}
                        name="district_display"
                        placeholder="Select province first"
                        radius="md"
                        size="md"
                        type="text"
                        value={districtLabel}
                        variant="bordered"
                      />
                    )
                  ) : (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="district_display"
                      radius="md"
                      size="md"
                      type="text"
                      value={districtLabel}
                      variant="bordered"
                    />
                  )}
                </div>

                <input name="district" type="hidden" value={selectedDistrictId} />
                <input name="province" type="hidden" value={computedProvince} />
                <input name="provinceId" type="hidden" value={selectedProvinceId} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Municipality / City</label>
                  {selectedDistrictId ? (
                    <Select
                      classNames={{
                        trigger: "border-gray-300",
                      }}
                      placeholder={
                        municipalities.length === 0
                          ? cityInput || "Choose Municipality / City"
                          : "Choose Municipality / City"
                      }
                      name="cityMunicipality"
                      radius="md"
                      selectedKeys={cityInput ? new Set([String(cityInput)]) : new Set()}
                      size="md"
                      variant="bordered"
                      onSelectionChange={(keys: any) => {
                        const val = Array.from(keys)[0] as string
                        if (municipalities && municipalities.length > 0) {
                          const found = municipalities.find(
                            (m: any) =>
                              String(m._id) === String(val) ||
                              String(m.id) === String(val) ||
                              String(m.name || m.Name || m.City_Municipality) === String(val),
                          )
                          if (found) {
                            setSelectedMunicipalityId(String(found._id || found.id))
                            setCityInput(String(found.name || found.Name || found.City_Municipality || found))
                            return
                          }
                        }
                        setSelectedMunicipalityId(String(val || ""))
                        setCityInput(val || "")
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
                      ) : computedCity ? (
                        <SelectItem key={String(computedCity)} textValue={String(computedCity)}>
                          {String(computedCity)}
                        </SelectItem>
                      ) : null}
                    </Select>
                  ) : (
                    <Input
                      disabled
                      classNames={{
                        inputWrapper: "border-gray-300 bg-gray-50",
                      }}
                      name="cityMunicipality_display"
                      placeholder="Select district first"
                      radius="md"
                      size="md"
                      type="text"
                      value={cityInput || ""}
                      variant="bordered"
                    />
                  )}
                  <input name="cityMunicipality" type="hidden" value={cityInput} />
                  <input name="municipality" type="hidden" value={selectedMunicipalityId} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Organization / Institution</label>
                  <Input
                    classNames={{
                      inputWrapper: "border-gray-300",
                    }}
                    placeholder="Enter Organization / Institution"
                    name="organization"
                    radius="md"
                    size="md"
                    type="text"
                    variant="bordered"
                  />
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="gap-3 px-6 py-6 border-t border-gray-200">
              <Button className="flex-1 font-medium" radius="md" size="md" variant="bordered" onPress={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-black text-white font-medium hover:bg-gray-900"
                color="default"
                isDisabled={isSubmitting}
                radius="md"
                size="md"
                type="submit"
              >
                {isSubmitting ? "Adding..." : "Add Stakeholder"}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
