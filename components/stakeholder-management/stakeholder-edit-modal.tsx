"use client"

import { useEffect, useState, useMemo } from "react"
import { Eye, EyeSlash as EyeOff } from "@gravity-ui/icons"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"
import { Button } from "@heroui/button"
import { Input } from "@heroui/input"
import { Select, SelectItem } from "@heroui/select"
import { useStakeholderManagement } from "@/hooks/useStakeholderManagement"
import { updateStakeholder, getStakeholder, getStakeholderEditContext } from "@/services/stakeholderService"
import { getUserAuthority } from "@/utils/getUserAuthority"
import { getUserInfo } from "@/utils/getUserInfo"

interface EditStakeholderModalProps {
  isOpen: boolean
  onClose: () => void
  stakeholder: any | null
  onSaved?: () => void
}

export default function EditStakeholderModal({
  isOpen,
  onClose,
  stakeholder,
  onSaved,
}: EditStakeholderModalProps) {
  const {
    roleOptions,
    municipalityOptions,
    barangayOptions,
    organizationOptions,
    canChooseMunicipality,
    canChooseOrganization,
    isSystemAdmin,
    loading: hookLoading,
    fetchBarangays,
    // Legacy compatibility
    creatorCoverageAreas,
    allowedOrganizations,
  } = useStakeholderManagement()

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [organization, setOrganization] = useState("")
  const [organizationId, setOrganizationId] = useState<string>("")
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("")
  const [selectedBarangay, setSelectedBarangay] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [stakeholderData, setStakeholderData] = useState<any>(null)
  const [province, setProvince] = useState<string>("")
  const [district, setDistrict] = useState<string>("")
  const [currentUserAuthority, setCurrentUserAuthority] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string>("")
  const [selectedDistrict, setSelectedDistrict] = useState<string>("")
  const [provinceOptions, setProvinceOptions] = useState<any[]>([])
  const [districtOptions, setDistrictOptions] = useState<any[]>([])
  const [filteredMunicipalityOptions, setFilteredMunicipalityOptions] = useState<any[]>([])
  
  // Deduplication helper function
  const deduplicateById = <T extends { _id?: any; id?: any }>(items: T[]): T[] => {
    const seen = new Set<string>()
    return items.filter((item) => {
      const id = String(item._id || item.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
  
  // Deduplicated option arrays
  const uniqueProvinceOptions = useMemo(() => deduplicateById(provinceOptions), [provinceOptions])
  const uniqueDistrictOptions = useMemo(() => deduplicateById(districtOptions), [districtOptions])
  const uniqueMunicipalityOptions = useMemo(() => deduplicateById(municipalityOptions), [municipalityOptions])
  const uniqueOrganizationOptions = useMemo(() => deduplicateById(organizationOptions), [organizationOptions])
  const uniqueFilteredMunicipalityOptions = useMemo(() => deduplicateById(filteredMunicipalityOptions), [filteredMunicipalityOptions])
  // Fetch current user's authority when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchCurrentUserData = async () => {
        try {
          // Get current user ID from getUserInfo
          const userInfo = getUserInfo()
          const userId = userInfo.raw?._id || 
                        userInfo.raw?.id || 
                        userInfo.raw?.user?._id ||
                        userInfo.raw?.user?.id ||
                        null
          
          if (userId) {
            setCurrentUserId(String(userId))
            
            // Fetch current user's authority
            const authority = await getUserAuthority(String(userId))
            setCurrentUserAuthority(authority)
          }
        } catch (error) {
          console.error('Failed to fetch current user data:', error)
        }
      }
      
      fetchCurrentUserData()
    }
  }, [isOpen])

  // Fetch stakeholder edit context when modal opens (simplified approach)
  useEffect(() => {
    if (isOpen && stakeholder) {
      const loadEditData = async () => {
        try {
          const stakeholderId = stakeholder._id || stakeholder.id || stakeholder.Stakeholder_ID || stakeholder.StakeholderId
          if (!stakeholderId) {
            console.error('[EditStakeholderModal] No stakeholder ID available')
            return
          }

          console.log('[EditStakeholderModal] Loading edit context for stakeholder:', stakeholderId)
          
          // Fetch complete edit context from dedicated endpoint
          const editContext = await getStakeholderEditContext(String(stakeholderId))
          
          console.log('[EditStakeholderModal] Edit context loaded:', {
            hasRole: !!editContext.role,
            hasOrganization: !!editContext.organization,
            hasLocation: !!editContext.location,
            editPermissions: editContext.editPermissions,
            hookLoading: hookLoading,
            municipalityOptionsCount: municipalityOptions.length,
            organizationOptionsCount: organizationOptions.length,
            isSystemAdmin: isSystemAdmin
          })
          
          // Set all form fields directly from edit context - no complex extraction needed
          setFirstName(editContext.firstName || "")
          setMiddleName(editContext.middleName || "")
          setLastName(editContext.lastName || "")
          setEmail(editContext.email || "")
          setPhoneNumber(editContext.phoneNumber || "")
          
          // Set role
          if (editContext.role) {
            setSelectedRole(editContext.role._id)
          }
          
          // Set organization
          if (editContext.organization) {
            setOrganizationId(editContext.organization._id)
            setOrganization(editContext.organization.name)
          }
          
          // Set location data
          if (editContext.location) {
            // For admins, set province and district IDs FIRST so municipality filtering works correctly
            if (editContext.editPermissions.canEditProvinceDistrict) {
              if (editContext.location.province) {
                setSelectedProvince(editContext.location.province._id)
                setProvince(editContext.location.province.name)
              }
              if (editContext.location.district) {
                setSelectedDistrict(editContext.location.district._id)
                setDistrict(editContext.location.district.name)
              }
            } else {
              // For coordinators, just set display names
              if (editContext.location.province) {
                setProvince(editContext.location.province.name)
              }
              if (editContext.location.district) {
                setDistrict(editContext.location.district.name)
              }
            }
            
            // Municipality - set immediately (filtering logic will ensure it's included)
            if (editContext.location.municipality) {
              setSelectedMunicipality(editContext.location.municipality._id)
              fetchBarangays(editContext.location.municipality._id)
            }
            
            // Barangay
            if (editContext.location.barangay) {
              setSelectedBarangay(editContext.location.barangay._id)
            }
          }
          
          // Store edit context for reference
          setStakeholderData(editContext)
          
        } catch (error: any) {
          console.error('[EditStakeholderModal] Failed to load edit context:', error)
          // Fallback: try to use stakeholder prop data
          console.log('[EditStakeholderModal] Falling back to stakeholder prop data')
          setStakeholderData(stakeholder)
          
          // Try to extract basic fields from prop as fallback
          setFirstName(stakeholder.name?.split(' ')[0] || stakeholder.firstName || stakeholder.First_Name || "")
          setLastName(stakeholder.name?.split(' ').slice(-1)[0] || stakeholder.lastName || stakeholder.Last_Name || "")
          setEmail(stakeholder.email || stakeholder.Email || "")
          setPhoneNumber(stakeholder.phone || stakeholder.phoneNumber || stakeholder.Phone_Number || "")
        }
      }
      
      loadEditData()
    } else if (!isOpen) {
      // Reset all form fields when modal closes
      setFirstName("")
      setMiddleName("")
      setLastName("")
      setEmail("")
      setPhoneNumber("")
      setOrganization("")
      setOrganizationId("")
      setSelectedMunicipality("")
      setSelectedBarangay("")
      setSelectedRole("")
      setNewPassword("")
      setProvince("")
      setDistrict("")
      setSelectedProvince("")
      setSelectedDistrict("")
      setProvinceOptions([])
      setDistrictOptions([])
      setFilteredMunicipalityOptions([])
      setStakeholderData(null)
      setValidationErrors([])
      setCurrentUserAuthority(null)
    }
  }, [isOpen, stakeholder])


  // Fetch provinces for admins - deduplicated
  useEffect(() => {
    if (isOpen) {
      const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
      
      if (isAdmin && provinceOptions.length === 0) {
        const fetchProvincesForAdmin = async () => {
          try {
            const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
            const url = base
              ? `${base}/api/locations/provinces`
              : `/api/locations/provinces`
            const token =
              typeof window !== "undefined"
                ? localStorage.getItem("unite_token") ||
                  sessionStorage.getItem("unite_token")
                : null
            const headers: any = {}
            if (token) headers["Authorization"] = `Bearer ${token}`
            
            const res = await fetch(url, { headers })
            if (res.ok) {
              const text = await res.text()
              const json = text ? JSON.parse(text) : null
              const provinces = json?.data || json?.provinces || []
              
              // Deduplicate provinces before setting
              const uniqueProvinces = deduplicateById(provinces)
              console.log('[EditStakeholderModal] Loaded provinces:', {
                count: uniqueProvinces.length,
                selectedProvince: selectedProvince
              })
              setProvinceOptions(uniqueProvinces)
            } else {
              console.error('[EditStakeholderModal] Failed to fetch provinces:', res.status, res.statusText)
            }
          } catch (e) {
            console.error('[EditStakeholderModal] Error fetching provinces:', e)
          }
        }
        
        fetchProvincesForAdmin()
      }
    }
  }, [isOpen, currentUserAuthority, isSystemAdmin])
  
  // Note: Name-based matching removed - edit-context endpoint provides IDs directly

  // Fetch districts when province is selected (for admins) - deduplicated
  useEffect(() => {
    const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
    if (isOpen && isAdmin && selectedProvince) {
      console.log('[EditStakeholderModal] Fetching districts for province:', selectedProvince)
      const fetchDistricts = async () => {
        try {
          const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
          const url = base
            ? `${base}/api/locations/provinces/${selectedProvince}/districts`
            : `/api/locations/provinces/${selectedProvince}/districts`
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("unite_token") ||
                sessionStorage.getItem("unite_token")
              : null
          const headers: any = {}
          if (token) headers["Authorization"] = `Bearer ${token}`
          
          const res = await fetch(url, { headers })
          if (res.ok) {
            const text = await res.text()
            const json = text ? JSON.parse(text) : null
            const districts = json?.data || json?.districts || []
            
            // Deduplicate districts before setting
            const uniqueDistricts = deduplicateById(districts)
            console.log('[EditStakeholderModal] Loaded districts:', {
              count: uniqueDistricts.length,
              selectedDistrict: selectedDistrict
            })
            
            setDistrictOptions(uniqueDistricts)
          } else {
            console.error('[EditStakeholderModal] Failed to fetch districts:', res.status, res.statusText)
          }
        } catch (e) {
          console.error('[EditStakeholderModal] Error fetching districts:', e)
        }
      }
      fetchDistricts()
    } else if (isOpen && isAdmin && !selectedProvince) {
      setDistrictOptions([])
    }
  }, [isOpen, currentUserAuthority, isSystemAdmin, selectedProvince])

  // Filter municipalities based on selected district (for admins) - simplified and deduplicated
  useEffect(() => {
    if (!isOpen) return
    
    const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
    const isCoordinator = currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80
    
    if (isAdmin) {
      if (selectedDistrict) {
        // Filter municipalities by district
        const filtered = uniqueMunicipalityOptions.filter((muni: any) => {
          const parentId = muni.parent?._id || muni.parent?.id || muni.parent
          return parentId && String(parentId) === String(selectedDistrict)
        })
        
        // ALWAYS ensure current municipality is in the list, even if it doesn't match the district filter
        // This handles the case where municipality is set before district filtering happens
        if (selectedMunicipality) {
          const currentMuni = uniqueMunicipalityOptions.find((m: any) => {
            const muniId = m._id || m.id
            return String(muniId) === String(selectedMunicipality)
          })
          
          if (currentMuni) {
            const alreadyInList = filtered.some((m: any) => {
              const muniId = m._id || m.id
              return String(muniId) === String(selectedMunicipality)
            })
            if (!alreadyInList) {
              const parentId = typeof currentMuni.parent === 'object' 
                ? (currentMuni.parent?._id || (currentMuni.parent as any)?.id)
                : currentMuni.parent
              console.log('[EditStakeholderModal] Adding current municipality to filtered list (district mismatch):', {
                municipalityId: selectedMunicipality,
                municipalityName: currentMuni.name,
                municipalityParent: parentId,
                selectedDistrict: selectedDistrict
              })
              filtered.push(currentMuni)
            }
          } else {
            console.warn('[EditStakeholderModal] Current municipality not found in options:', selectedMunicipality)
          }
        }
        
        console.log('[EditStakeholderModal] Filtered municipalities for district:', {
          districtId: selectedDistrict,
          filteredCount: filtered.length,
          selectedMunicipality: selectedMunicipality,
          municipalityInList: selectedMunicipality ? filtered.some((m: any) => String(m._id || m.id) === String(selectedMunicipality)) : false
        })
        
        setFilteredMunicipalityOptions(filtered)
      } else if (selectedMunicipality) {
        // No district selected yet, but municipality is set - keep it in the list
        const currentMuni = uniqueMunicipalityOptions.find((m: any) => {
          const muniId = m._id || m.id
          return String(muniId) === String(selectedMunicipality)
        })
        if (currentMuni) {
          console.log('[EditStakeholderModal] No district selected, showing current municipality only:', currentMuni.name)
          setFilteredMunicipalityOptions([currentMuni])
        } else {
          // Municipality not found in options yet, show all (will update when options load)
          console.log('[EditStakeholderModal] Municipality not found in options yet, showing all')
          setFilteredMunicipalityOptions(uniqueMunicipalityOptions)
        }
      } else {
        // No district or municipality selected - show all municipalities
        setFilteredMunicipalityOptions(uniqueMunicipalityOptions)
      }
    } else if (isCoordinator) {
      // For coordinators, use all municipality options from hook (already filtered by coverage)
      setFilteredMunicipalityOptions(uniqueMunicipalityOptions)
    } else {
      // Authority not loaded yet - use all options temporarily
      setFilteredMunicipalityOptions(uniqueMunicipalityOptions)
    }
  }, [isOpen, currentUserAuthority, isSystemAdmin, selectedDistrict, uniqueMunicipalityOptions, selectedMunicipality])

  // Fetch barangays when municipality is selected
  useEffect(() => {
    if (selectedMunicipality) {
      fetchBarangays(selectedMunicipality)
    }
  }, [selectedMunicipality, fetchBarangays])

  // Verify organizationId exists in options when they load and set it if missing
  useEffect(() => {
    if (isOpen && uniqueOrganizationOptions.length > 0 && stakeholderData) {
      // If organizationId is not set but we have edit context data, set it
      if (!organizationId && stakeholderData.organization && stakeholderData.organization._id) {
        const orgId = stakeholderData.organization._id
        const orgExists = uniqueOrganizationOptions.some(o => String(o._id) === String(orgId))
        if (orgExists) {
          console.log('[EditStakeholderModal] Setting organizationId from edit context:', {
            orgId: orgId,
            orgName: stakeholderData.organization.name
          })
          setOrganizationId(orgId)
          if (stakeholderData.organization.name) {
            setOrganization(stakeholderData.organization.name)
          }
        } else {
          console.warn('[EditStakeholderModal] Organization from edit context not found in options:', {
            orgId: orgId,
            orgName: stakeholderData.organization.name,
            availableOptions: uniqueOrganizationOptions.map(o => ({ id: o._id, name: o.name }))
          })
          // For admins, if org not in options, this is unexpected - log it
          // For coordinators, try to use first available
          if (!canChooseOrganization && uniqueOrganizationOptions.length > 0) {
            const firstOrg = uniqueOrganizationOptions[0]
            if (firstOrg._id) {
              console.log('[EditStakeholderModal] Using first available organization:', firstOrg._id)
              setOrganizationId(String(firstOrg._id))
              if (firstOrg.name) {
                setOrganization(firstOrg.name)
              }
            }
          }
        }
      } else if (organizationId) {
        // Verify existing organizationId exists in options
        const orgExists = uniqueOrganizationOptions.some(o => String(o._id) === String(organizationId))
        if (!orgExists) {
          console.warn('[EditStakeholderModal] Organization ID not found in options:', {
            orgId: organizationId,
            availableOptions: uniqueOrganizationOptions.map(o => ({ id: o._id, name: o.name }))
          })
          // For coordinators, if org not in options, try to use first available
          if (!canChooseOrganization && uniqueOrganizationOptions.length > 0) {
            const firstOrg = uniqueOrganizationOptions[0]
            if (firstOrg._id) {
              console.log('[EditStakeholderModal] Using first available organization:', firstOrg._id)
              setOrganizationId(String(firstOrg._id))
              if (firstOrg.name) {
                setOrganization(firstOrg.name)
              }
            }
          }
        } else {
          // Update organization name if available
          const foundOrg = uniqueOrganizationOptions.find(o => String(o._id) === String(organizationId))
          if (foundOrg && foundOrg.name && foundOrg.name !== organization) {
            setOrganization(foundOrg.name)
          }
        }
      }
    }
  }, [isOpen, organizationId, uniqueOrganizationOptions, canChooseOrganization, organization, stakeholderData])

  // Filter roles for admins (only show authority >= 59)
  const filteredRoleOptions = useMemo(() => {
    const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
    if (isAdmin) {
      // For admins, only show roles with authority >= 59
      return roleOptions.filter(role => (role.authority || 0) >= 59)
    }
    return roleOptions
  }, [roleOptions, currentUserAuthority, isSystemAdmin])

  // Get filtered municipality options based on admin selections (deduplicated)
  const availableMunicipalityOptions = useMemo(() => {
    const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
    if (isAdmin) {
      return uniqueFilteredMunicipalityOptions.length > 0 ? uniqueFilteredMunicipalityOptions : uniqueMunicipalityOptions
    }
    return uniqueMunicipalityOptions
  }, [currentUserAuthority, isSystemAdmin, uniqueFilteredMunicipalityOptions, uniqueMunicipalityOptions])

  // Diagnostic logging for field states
  useEffect(() => {
    if (isOpen) {
      const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
      console.log('[EditStakeholderModal] Field States Summary:', {
        authority: currentUserAuthority,
        isAdmin: isAdmin,
        isCoordinator: currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80,
        canChooseMunicipality,
        canChooseOrganization,
        isSystemAdmin,
        hookLoading,
        province: province || 'not set',
        district: district || 'not set',
        selectedProvince: selectedProvince || 'not set',
        selectedDistrict: selectedDistrict || 'not set',
        selectedMunicipality: selectedMunicipality || 'not set',
        organizationId: organizationId || 'not set',
        organization: organization || 'not set',
        roleOptionsCount: roleOptions.length,
        municipalityOptionsCount: municipalityOptions.length,
        filteredMunicipalityOptionsCount: filteredMunicipalityOptions.length,
        barangayOptionsCount: barangayOptions.length,
        organizationOptionsCount: organizationOptions.length,
        provinceOptionsCount: provinceOptions.length,
        districtOptionsCount: districtOptions.length,
        selectedRole: selectedRole || 'none',
        stakeholderData: stakeholderData ? {
          hasOrganization: !!(stakeholderData.organization || stakeholderData.organizationId || stakeholderData.organizations),
          hasLocations: !!stakeholderData.locations,
          hasRoles: !!(stakeholderData.roles && Array.isArray(stakeholderData.roles))
        } : null
      } as any);
    }
  }, [isOpen, hookLoading, canChooseMunicipality, canChooseOrganization, isSystemAdmin, currentUserAuthority, province, district, selectedProvince, selectedDistrict, roleOptions.length, municipalityOptions.length, filteredMunicipalityOptions.length, barangayOptions.length, organizationOptions.length, provinceOptions.length, districtOptions.length, selectedRole, selectedMunicipality, selectedBarangay, organizationId, organization, stakeholderData]);

  const handleSave = async () => {
    if (!stakeholder && !stakeholderData) return

    setIsSubmitting(true)
    setValidationErrors([])

    try {
      const stakeholderId = stakeholder?._id || stakeholder?.id || stakeholder?.Stakeholder_ID || stakeholder?.StakeholderId
        || stakeholderData?._id || stakeholderData?.id
      if (!stakeholderId) throw new Error("Stakeholder id not available")

      const payload: any = {
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
      }

      // Organization: Only admins (authority ≥ 80) or coordinators (60-79) with multiple orgs can change
      const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
      if (isAdmin) {
        // Admin can change organization
        if (canChooseOrganization && organizationId) {
          payload.organizationId = organizationId
        }
      } else if (currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80) {
        // Coordinator can only change if they have multiple organizations
        if (organizationOptions.length > 1 && organizationId) {
          // Validate that organizationId is in coordinator's allowed organizations
          const isAllowed = organizationOptions.some(org => String(org._id) === String(organizationId))
          if (isAllowed) {
            payload.organizationId = organizationId
          }
        }
      }
      
      // Update municipality/barangay if changed
      // For coordinators, municipality must be within their scope (already filtered by hook)
      if (canChooseMunicipality && selectedMunicipality) {
        payload.municipalityId = selectedMunicipality
        if (selectedBarangay) {
          payload.barangayId = selectedBarangay
        }
      }
      
      // Note: Province and District are not sent in payload as they're derived from municipality

      // Update role if changed (only if creator has authority to assign it)
      if (selectedRole) {
        payload.roles = [selectedRole] // Send role ID
      }

      // Password is optional
      if (newPassword && String(newPassword).trim().length > 0) {
        payload.password = newPassword
      }

      const response = await updateStakeholder(String(stakeholderId), payload)

      if (!response.success) {
        throw new Error(response.message || "Failed to update stakeholder")
      }

      if (onSaved) {
        try {
          await onSaved()
        } catch (e) {
          // ignore onSaved errors but continue to close
        }
      }

      onClose()
    } catch (err: any) {
      setValidationErrors([err?.message || "Failed to save changes"])
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!stakeholder && !stakeholderData) return null

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

            {/* Role Selection */}
            {filteredRoleOptions.length > 1 ? (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Role
                </label>
                <Select
                  placeholder="Select Role"
                  selectedKeys={selectedRole ? new Set([selectedRole]) : new Set()}
                  isDisabled={hookLoading || !((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin)}
                  onSelectionChange={(keys: any) => {
                    const roleId = Array.from(keys)[0] as string
                    setSelectedRole(roleId)
                  }}
                >
                  {filteredRoleOptions.map((role) => {
                    const roleId = role._id || role.id
                    const roleName = role.name || role.code || String(roleId)
                    return (
                      <SelectItem key={String(roleId)} textValue={roleName}>
                        {roleName} {role.authority ? `(Authority: ${role.authority})` : ''}
                      </SelectItem>
                    )
                  })}
                </Select>
              </div>
            ) : filteredRoleOptions.length === 1 ? (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Role
                </label>
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={filteredRoleOptions[0].name || filteredRoleOptions[0].code || "Stakeholder"}
                  variant="bordered"
                  description="Role is set to your only available option"
                />
              </div>
            ) : null}

            {/* Province Field */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Province
              </label>
              {((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) ? (
                <Select
                  placeholder="Select Province"
                  selectedKeys={selectedProvince ? new Set([selectedProvince]) : new Set()}
                  isDisabled={hookLoading}
                  onSelectionChange={(keys: any) => {
                    const provinceId = Array.from(keys)[0] as string
                    setSelectedProvince(provinceId)
                    // Reset district and municipality when province changes
                    setSelectedDistrict("")
                    setSelectedMunicipality("")
                    setSelectedBarangay("")
                    // Districts will be fetched automatically via useEffect when selectedProvince changes
                  }}
                >
                  {uniqueProvinceOptions.map((prov) => {
                    const provId = prov._id || prov.id
                    const provName = prov.name || prov.Name || prov.Province_Name || String(provId)
                    return (
                      <SelectItem key={String(provId)} textValue={provName}>
                        {provName}
                      </SelectItem>
                    )
                  })}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={province || "Not set"}
                  variant="bordered"
                  description={
                    currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80
                      ? "Province is fixed to stakeholder's location"
                      : "Province is determined by municipality"
                  }
                />
              )}
            </div>

            {/* District Field */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                District
              </label>
              {((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) ? (
                <Select
                  placeholder={selectedProvince ? "Select District" : "Select Province first"}
                  selectedKeys={selectedDistrict ? new Set([selectedDistrict]) : new Set()}
                  isDisabled={hookLoading || !selectedProvince}
                  onSelectionChange={(keys: any) => {
                    const districtId = Array.from(keys)[0] as string
                    const prevDistrict = selectedDistrict
                    setSelectedDistrict(districtId)
                    
                    // Only reset municipality if it doesn't belong to the new district
                    // Check if current municipality's parent matches the new district
                    if (selectedMunicipality) {
                      const currentMuni = uniqueMunicipalityOptions.find((m: any) => {
                        const muniId = m._id || m.id
                        return String(muniId) === String(selectedMunicipality)
                      })
                      
                      if (currentMuni) {
                        const muniParentId = typeof currentMuni.parent === 'object'
                          ? (currentMuni.parent?._id || (currentMuni.parent as any)?.id)
                          : currentMuni.parent
                        // If municipality's parent doesn't match new district, reset it
                        if (muniParentId && String(muniParentId) !== String(districtId)) {
                          setSelectedMunicipality("")
                          setSelectedBarangay("")
                        }
                        // Otherwise keep the municipality (it belongs to the new district)
                      } else {
                        // Municipality not found in options, reset it
                        setSelectedMunicipality("")
                        setSelectedBarangay("")
                      }
                    }
                    // Municipalities will be filtered automatically via useEffect when selectedDistrict changes
                  }}
                >
                  {uniqueDistrictOptions.map((dist) => {
                    const distId = dist._id || dist.id
                    const distName = dist.name || dist.Name || dist.District_Name || String(distId)
                    return (
                      <SelectItem key={String(distId)} textValue={distName}>
                        {distName}
                      </SelectItem>
                    )
                  })}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={district || "Not set"}
                  variant="bordered"
                  description={
                    currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80
                      ? "District is fixed to stakeholder's location"
                      : "District is determined by municipality"
                  }
                />
              )}
            </div>

            {/* Municipality Selection */}
            {canChooseMunicipality || ((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) ? (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Municipality <span className="text-red-500">*</span>
                </label>
                <Select
                  isRequired
                  placeholder={
                    (((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) && selectedDistrict)
                      ? "Select Municipality"
                      : (((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) && !selectedDistrict && !selectedMunicipality)
                      ? "Select District first"
                      : "Select Municipality"
                  }
                  selectedKeys={selectedMunicipality ? new Set([selectedMunicipality]) : new Set()}
                  isDisabled={
                    hookLoading || 
                    (((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) && !selectedDistrict && !selectedMunicipality)
                  }
                  onSelectionChange={(keys: any) => {
                    const muniId = Array.from(keys)[0] as string
                    setSelectedMunicipality(muniId)
                    fetchBarangays(muniId)
                    setSelectedBarangay("") // Reset barangay when municipality changes
                    
                    // For admins, fetch ancestors to update province/district when municipality changes
                    const isAdmin = (currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin
                    if (isAdmin) {
                      const updateLocationFromMunicipality = async () => {
                        try {
                          const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
                          const url = base
                            ? `${base}/api/locations/${muniId}/ancestors`
                            : `/api/locations/${muniId}/ancestors`
                          const token =
                            typeof window !== "undefined"
                              ? localStorage.getItem("unite_token") ||
                                sessionStorage.getItem("unite_token")
                              : null
                          const headers: any = {}
                          if (token) headers["Authorization"] = `Bearer ${token}`
                          
                          const res = await fetch(url, { headers })
                          if (res.ok) {
                            const text = await res.text()
                            const json = text ? JSON.parse(text) : null
                            const ancestors = json?.data || []
                            
                            const districtObj = ancestors.find((a: any) => 
                              a.type === 'district' || 
                              (a.type === 'city' && a.metadata?.isCity)
                            )
                            const provinceObj = ancestors.find((a: any) => a.type === 'province')
                            
                            if (districtObj) {
                              const districtId = districtObj._id || districtObj.id
                              const districtName = districtObj.name || districtObj.Name || districtObj.District_Name || ""
                              if (districtId && String(selectedDistrict) !== String(districtId)) {
                                setSelectedDistrict(String(districtId))
                              }
                              if (districtName) {
                                setDistrict(districtName)
                              }
                            }
                            
                            if (provinceObj) {
                              const provinceId = provinceObj._id || provinceObj.id
                              const provinceName = provinceObj.name || provinceObj.Name || provinceObj.Province_Name || ""
                              if (provinceId && String(selectedProvince) !== String(provinceId)) {
                                setSelectedProvince(String(provinceId))
                              }
                              if (provinceName) {
                                setProvince(provinceName)
                              }
                            }
                          }
                        } catch (e) {
                          console.error('Failed to update location from municipality:', e)
                        }
                      }
                      updateLocationFromMunicipality()
                    }
                  }}
                >
                  {availableMunicipalityOptions.map((muni) => {
                    const muniId = muni._id || muni.id
                    const muniName = muni.name || String(muniId)
                    return (
                      <SelectItem key={String(muniId)} textValue={muniName}>
                        {muniName}
                      </SelectItem>
                    )
                  })}
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Municipality
                </label>
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={(() => {
                    // Try to get municipality name from various sources
                    if (stakeholderData?.locations?.municipalityName) {
                      return stakeholderData.locations.municipalityName
                    }
                    if (stakeholderData?.locations?.municipality?.name) {
                      return stakeholderData.locations.municipality.name
                    }
                    if (stakeholderData?.locations?.municipality && (stakeholderData.locations.municipality as any).Name) {
                      return (stakeholderData.locations.municipality as any).Name
                    }
                    // Try to find in municipalityOptions by ID
                    if (selectedMunicipality && municipalityOptions.length > 0) {
                      const muni = municipalityOptions.find((m: any) => {
                        const muniId = m._id || m.id
                        return String(muniId) === String(selectedMunicipality)
                      })
                      if (muni) {
                        return (muni as any).name || (muni as any).Name || ""
                      }
                    }
                    return selectedMunicipality || "Not set"
                  })()}
                  variant="bordered"
                  description="Municipality cannot be changed"
                />
              </div>
            )}

            {/* Barangay Selection (Optional) */}
            {selectedMunicipality && (
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Barangay <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <Select
                  placeholder={hookLoading ? "Loading barangays..." : barangayOptions.length === 0 ? "No barangays available" : "Select Barangay (Optional)"}
                  selectedKeys={selectedBarangay ? new Set([selectedBarangay]) : new Set()}
                  isDisabled={hookLoading || barangayOptions.length === 0}
                  onSelectionChange={(keys: any) => {
                    const barangayId = Array.from(keys)[0] as string
                    setSelectedBarangay(barangayId || "")
                  }}
                >
                  {barangayOptions.map((brgy: any) => {
                    const brgyId = brgy._id || (brgy as any).id
                    const brgyName = brgy.name || String(brgyId)
                    return (
                      <SelectItem key={String(brgyId)} textValue={brgyName}>
                        {brgyName}
                      </SelectItem>
                    )
                  })}
                </Select>
              </div>
            )}

            {/* Organization */}
            <div>
              <label className="text-sm font-semibold text-gray-900 mb-2 block">
                Organization
              </label>
              {canChooseOrganization || (currentUserAuthority !== null && currentUserAuthority >= 60 && currentUserAuthority < 80 && organizationOptions.length > 1) || ((currentUserAuthority !== null && currentUserAuthority >= 80) || isSystemAdmin) ? (
                <Select
                  placeholder="Select Organization"
                  selectedKeys={organizationId ? new Set([organizationId]) : new Set()}
                  isDisabled={hookLoading}
                  onSelectionChange={(keys: any) => {
                    const orgId = Array.from(keys)[0] as string
                    setOrganizationId(orgId)
                  }}
                >
                  {uniqueOrganizationOptions.map((org) => {
                    const orgId = org._id
                    const orgName = org.name || String(orgId)
                    return (
                      <SelectItem key={String(orgId)} textValue={orgName}>
                        {orgName}
                      </SelectItem>
                    )
                  })}
                </Select>
              ) : (
                <Input
                  disabled
                  classNames={{ inputWrapper: "h-10 bg-gray-100" }}
                  type="text"
                  value={(() => {
                    // First try to get from new organizations[] array structure
                    if (stakeholderData?.organizations && Array.isArray(stakeholderData.organizations) && stakeholderData.organizations.length > 0) {
                      const org = stakeholderData.organizations[0]
                      if (org.organizationName) {
                        return org.organizationName
                      }
                      // If no name, try to find it in organizationOptions
                      const orgId = org.organizationId?._id || org.organizationId || org._id
                      if (orgId) {
                        const foundOrg = organizationOptions.find(o => String(o._id) === String(orgId))
                        if (foundOrg) return foundOrg.name
                      }
                    }
                    // Fallback: try legacy organization field
                    if (stakeholderData?.organization) {
                      const org = stakeholderData.organization
                      if (typeof org === 'object' && org.name) {
                        return org.name
                      }
                      if (typeof org === 'string') {
                        return org
                      }
                    }
                    // Fallback: try organizationId field
                    if (stakeholderData?.organizationId) {
                      const org = stakeholderData.organizationId
                      if (typeof org === 'object' && org.name) {
                        return org.name
                      }
                      // If it's just an ID, try to find it in organizationOptions
                      const orgId = typeof org === 'object' ? org._id : org
                      if (orgId) {
                        const foundOrg = organizationOptions.find(o => String(o._id) === String(orgId))
                        if (foundOrg) return foundOrg.name
                      }
                    }
                    // If we have organizationId set, try to find it in organizationOptions
                    if (organizationId) {
                      const foundOrg = organizationOptions.find(o => String(o._id) === String(organizationId))
                      if (foundOrg) return foundOrg.name
                    }
                    // Last resort: if coordinator and no stakeholder org found, show coordinator's org as fallback
                    // (This should rarely happen - stakeholder should always have an org)
                    if (!canChooseOrganization && organizationOptions.length > 0) {
                      return organizationOptions[0].name || String(organizationOptions[0]._id)
                    }
                    return ""
                  })()}
                  variant="bordered"
                  description="Only system administrators can change organization"
                />
              )}
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
