"use client"


import { useState, useEffect } from "react"
import Topbar from "@/components/topbar"
import CoordinatorToolbar from "@/components/coordinator-management/coordinator-management-toolbar"
import CoordinatorTable from "@/components/coordinator-management/coordinator-management-table"
import AddCoordinatorModal from "@/components/coordinator-management/add-coordinator-modal"


interface CoordinatorFormData {
  firstName: string
  middleName?: string
  lastName: string
  coordinatorName?: string
  coordinatorEmail: string
  contactNumber: string
  password: string
  retypePassword: string
  province: string
  district: string
  districtId?: string
}


export default function CoordinatorManagement() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [coordinators, setCoordinators] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }


  const handleUserClick = () => {
    console.log("User profile clicked")
  }


  const handleExport = () => {
    console.log("Exporting data...")
  }


  const handleQuickFilter = () => {
    console.log("Opening quick filter...")
  }


  const handleAdvancedFilter = () => {
    console.log("Opening advanced filter...")
  }


  const handleAddCoordinator = () => {
    setIsAddModalOpen(true)
  }


  const handleModalClose = () => {
    setIsAddModalOpen(false)
  }


  const handleModalSubmit = async (data: CoordinatorFormData) => {
    console.log("New coordinator data:", data)
    setIsCreating(true)
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
      // get logged-in admin id and token
      let rawUser = null
      try { rawUser = localStorage.getItem('unite_user') } catch (e) { rawUser = null }
      const user = rawUser ? JSON.parse(rawUser) : null
      const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null
      const adminId = user?.id || user?.ID || user?.Staff_ID || user?.StaffId || user?.Admin_ID || user?.adminId || null
      if (!adminId) throw new Error('Logged-in admin id not found')

      const url = base ? `${base}/api/admin/${encodeURIComponent(adminId)}/coordinators` : `/api/admin/${encodeURIComponent(adminId)}/coordinators`

      // The backend expects { staffData, coordinatorData, createdByAdminId } in body (see coordinator.service.createCoordinatorAccount)
      const staffData = {
        First_Name: data.firstName,
        Middle_Name: data.middleName || null,
        Last_Name: data.lastName,
        Email: data.coordinatorEmail,
        Phone_Number: data.contactNumber,
        Password: data.password
      }

      const coordinatorData = {
        District_ID: data.districtId || data.district,
        Province_Name: data.province
      }

      const body = { staffData, coordinatorData, createdByAdminId: adminId }

      const headers: any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      const text = await res.text()
      let json: any = null
      try { json = text ? JSON.parse(text) : null } catch (err) { throw new Error(`Invalid JSON response when creating coordinator: ${text.slice(0,200)}`) }
      if (!res.ok) throw new Error(json?.message || `Failed to create coordinator (status ${res.status})`)

      // success: refresh coordinators list
      await (async () => {
        // reuse fetchCoordinators logic: crudely re-run the effect by calling internal fetch
        setLoading(true)
        setError(null)
        try {
          const listBase = base
          const adminUrl = listBase
            ? `${listBase}/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000`
            : `/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000`
          const listRes = await fetch(adminUrl, { headers })
          const listText = await listRes.text()
          const listJson = listText ? JSON.parse(listText) : null
          const items = listJson?.data || listJson?.coordinators || []
          const mapped = items.map((c: any) => {
            const staff = c.Staff || {}
            const district = c.District || null
            const province = c.Province_Name || (district && district.Province_Name) || ''
            const fullName = [staff.First_Name, staff.Middle_Name, staff.Last_Name].filter(Boolean).join(' ')
            return {
              id: c.Coordinator_ID || staff.ID || '',
              name: fullName,
              email: staff.Email || '',
              phone: staff.Phone_Number || '',
              province,
              district: (() => {
                if (!district) return ''
                const num = Number(district.District_Number)
                if (!Number.isNaN(num)) {
                  const j = num % 10, k = num % 100
                  if (j === 1 && k !== 11) return `${num}st District`
                  if (j === 2 && k !== 12) return `${num}nd District`
                  if (j === 3 && k !== 13) return `${num}rd District`
                  return `${num}th District`
                }
                return district.District_Name || ''
              })()
            }
          })
          setCoordinators(mapped)
        } catch (e) {
          // ignore refresh errors
        } finally { setLoading(false) }
      })()

      setIsAddModalOpen(false)
    } catch (err: any) {
      alert(err?.message || 'Failed to create coordinator')
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoordinators(coordinators.map((c) => c.id))
    } else {
      setSelectedCoordinators([])
    }
  }


  const handleSelectCoordinator = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCoordinators([...selectedCoordinators, id])
    } else {
      setSelectedCoordinators(selectedCoordinators.filter((cId) => cId !== id))
    }
  }


  const handleActionClick = (id: string) => {
    console.log("Action clicked for coordinator:", id)
  }


  // Fetch coordinators from backend and normalize shape for the table
  useEffect(() => {
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

    const formatDistrict = (districtObj: any) => {
      if (!districtObj) return ""
      if (districtObj.District_Number) return `${ordinalSuffix(districtObj.District_Number)} District`
      if (districtObj.District_Name) return districtObj.District_Name
      return ""
    }

    const fetchCoordinators = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use NEXT_PUBLIC_API_URL from .env.local (inlined at build time)
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
        // get logged-in user and token from local/session storage
        let rawUser = null
        try { rawUser = localStorage.getItem('unite_user'); } catch (e) { rawUser = null }
        const user = rawUser ? JSON.parse(rawUser) : null
        const token = (typeof window !== 'undefined') ? (localStorage.getItem('unite_token') || sessionStorage.getItem('unite_token')) : null

        // choose admin-managed endpoint when the logged-in user is a System Admin
        const adminId = user?.id || user?.ID || user?.Staff_ID || user?.StaffId || user?.Admin_ID || user?.adminId || null
        const isAdmin = (user && ((user.staff_type && user.staff_type.toLowerCase() === 'admin') || (user.role && user.role.toLowerCase() === 'admin') || (user.type && user.type.toLowerCase() === 'admin')))

        const url = base
          ? (isAdmin && adminId ? `${base}/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000` : `${base}/api/coordinators?limit=1000`)
          : (isAdmin && adminId ? `/api/admin/${encodeURIComponent(adminId)}/coordinators?limit=1000` : `/api/coordinators?limit=1000`)

        const headers: any = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(url, { headers })

        // Read as text first to avoid JSON parse errors when the server returns HTML (like a 404 page)
        const text = await res.text()
        let json: any = null
        try {
          json = text ? JSON.parse(text) : null
        } catch (parseErr) {
          // If response is not valid JSON, include a short snippet in the error to help debugging
          const snippet = text.slice(0, 300)
          throw new Error(`Invalid JSON response (status ${res.status}): ${snippet}`)
        }

        if (!res.ok) throw new Error(json?.message || `Failed to fetch coordinators (status ${res.status})`)

        const items = json.data || json.coordinators || []
        const mapped = items.map((c: any) => {
          const staff = c.Staff || {}
          const district = c.District || null
          const province = c.Province_Name || (district && district.Province_Name) || ''
          const fullName = [staff.First_Name, staff.Middle_Name, staff.Last_Name]
            .filter(Boolean)
            .join(' ')

          return {
            id: c.Coordinator_ID || staff.ID || '',
            name: fullName,
            email: staff.Email || '',
            phone: staff.Phone_Number || '',
            province,
            district: formatDistrict(district)
          }
        })

        setCoordinators(mapped)
      } catch (err: any) {
        setError(err.message || 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchCoordinators()
  }, [])


  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Coordinator Management</h1>
      </div>


      {/* Topbar Component */}
      <Topbar
        userName="Bicol Medical Center"
        userEmail="bmc@gmail.com"
        onUserClick={handleUserClick}
      />


      {/* Toolbar with Search and Actions */}
      <CoordinatorToolbar
        onExport={handleExport}
        onQuickFilter={handleQuickFilter}
        onAdvancedFilter={handleAdvancedFilter}
        onAddCoordinator={handleAddCoordinator}
        onSearch={handleSearch}
      />


      {/* Table Content */}
      <div className="px-6 py-4 bg-gray-50">
        {loading && <p className="text-sm text-gray-500">Loading coordinators...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <CoordinatorTable
          coordinators={coordinators}
          selectedCoordinators={selectedCoordinators}
          onSelectAll={handleSelectAll}
          onSelectCoordinator={handleSelectCoordinator}
          onActionClick={handleActionClick}
          searchQuery={searchQuery}
        />
      </div>


      {/* Add Coordinator Modal */}
      <AddCoordinatorModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}
