"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth"
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  where, // Imported 'where'
} from "firebase/firestore"

interface JobAd {
  id: string
  type: "job_seeker" | "employer"
  userId: string
  contactNumber: string
  email: string
  createdAt: any
  approved?: boolean // Added approval field
  hideMyName?: boolean // Added hide name field
  // Job seeker fields
  skills?: string
  workForm?: string
  jobTitle?: string
  gender?: string
  age?: number
  experience?: string
  region?: string
  fullName?: string // Added fullName field
  // Employer fields
  company?: string
  workerForm?: string
  ageRange?: string
  requiredSkills?: string
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [jobAds, setJobAds] = useState<JobAd[]>([])
  const [currentView, setCurrentView] = useState<"all" | "job_seeker" | "employer">("all")
  const [currentFormType, setCurrentFormType] = useState<"job_seeker" | "employer">("job_seeker")
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<JobAd | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactAction, setContactAction] = useState<{ type: "phone" | "email"; value: string } | null>(null)
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  const APP_ID = "axtargetbotwebsite"

  useEffect(() => {
    // Initialize Firebase Auth
    const initAuth = async () => {
      try {
        await signInAnonymously(auth)
      } catch (error) {
        console.error("Auth error:", error)
      }
    }

    initAuth()

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    if (!user) return

    const adsQuery = query(collection(db, `artifacts/${APP_ID}/public/data/job_ads`), where("approved", "==", true))

    const unsubscribe = onSnapshot(adsQuery, (snapshot) => {
      const ads: JobAd[] = []
      snapshot.forEach((doc) => {
        ads.push({ id: doc.id, ...doc.data() } as JobAd)
      })

      ads.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
        return timeB - timeA // Newest first
      })

      setJobAds(ads)
    })

    return () => unsubscribe()
  }, [user])

  const handleSubmitAd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    const adData: any = {
      type: currentFormType,
      userId: user.uid,
      createdAt: serverTimestamp(),
      approved: false, // New ads need approval
    }

    // Collect form data
    for (const [key, value] of formData.entries()) {
      adData[key] = value.toString().trim()
    }

    // Clean phone number
    if (adData.contactNumber) {
      adData.contactNumber = adData.contactNumber.replace(/[^\d]/g, "")
    }

    try {
      await addDoc(collection(db, `artifacts/${APP_ID}/public/data/job_ads`), adData)
      showAlert("Uğurlu!", "Elanınız 1-2 saat ərzində yoxlanılıb paylaşılacaqdır.")
      form.reset()
      setIsPostModalOpen(false)
    } catch (error) {
      console.error("Error adding ad:", error)
      showAlert("Xəta", "Elanınızı paylaşmaq mümkün olmadı.")
    }
  }

  const handleDeleteAd = async () => {
    if (!user || !deletingAdId) return

    try {
      await deleteDoc(doc(db, `artifacts/${APP_ID}/public/data/job_ads`, deletingAdId))
      showAlert("Uğurlu!", "Elanınız uğurla silindi.")
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error("Error deleting ad:", error)
      showAlert("Xəta", "Elanınızı silmək mümkün olmadı.")
    }
  }

  const showAlert = (title: string, message: string) => {
    setAlertModal({ title, message })
  }

  const openContactModal = (type: "phone" | "email", value: string) => {
    setContactAction({ type, value })
    setIsContactModalOpen(true)
  }

  const handleContactAction = () => {
    if (!contactAction) return

    if (contactAction.type === "phone") {
      window.location.href = `tel:+994${contactAction.value}`
    } else {
      window.location.href = `mailto:${contactAction.value}`
    }
    setIsContactModalOpen(false)
    setContactAction(null)
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const limited = cleaned.slice(0, 9)

    let formatted = ""
    if (limited.length > 0) formatted += limited.substring(0, 2)
    if (limited.length > 2) formatted += "-" + limited.substring(2, 5)
    if (limited.length > 5) formatted += "-" + limited.substring(5, 7)
    if (limited.length > 7) formatted += "-" + limited.substring(7, 9)

    return formatted
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId)
  }

  const filteredAds = currentView === "all" ? jobAds : jobAds.filter((ad) => ad.type === currentView)

  const renderAdCard = (ad: JobAd) => {
    const isJobSeeker = ad.type === "job_seeker"
    const isExpanded = expandedCardId === ad.id

    return (
      <div
        key={ad.id}
        className={`ad-card p-6 rounded-xl shadow-lg border flex flex-col justify-between ${isExpanded ? "expanded" : ""}`}
        onClick={() => toggleCardExpansion(ad.id)}
      >
        <div>
          <h3 className="text-xl font-bold text-gray-100 mb-2 flex items-center">
            <i className={`fa-solid ${isJobSeeker ? "fa-briefcase" : "fa-users-gear"} mr-2 text-emerald-500`}></i>
            {isJobSeeker
              ? `İş Axtaran: ${ad.jobTitle || "Vəzifə Qeyd Olunmayıb"}`
              : `İşçi Axtarılır: ${ad.company || "Şəxsi Elan"}`}
          </h3>

          <div className="text-gray-400 space-y-3 mb-4">
            {isJobSeeker ? (
              <p>
                <strong>Bacarıqlar:</strong> {ad.skills === "Bacarığım yoxdur" ? "Bacarıq yoxdur" : ad.skills}
              </p>
            ) : (
              <>
                <p>
                  <strong>Şirkət:</strong> {ad.company || "Şəxsi elan"}
                </p>
                <p>
                  <strong>Tələb olunan biliklər:</strong> {ad.requiredSkills || "Qeyd edilməyib"}
                </p>
              </>
            )}
          </div>

          <div className={`expanded-content ${isExpanded ? "show" : ""}`}>
            <div className="text-gray-400 space-y-2 mb-4 p-4 bg-gray-800 rounded-lg">
              <h4 className="text-emerald-500 font-semibold mb-2">Ətraflı Məlumat:</h4>
              {isJobSeeker ? (
                <>
                  {ad.fullName && !ad.hideMyName && (
                    <p>
                      <strong>Ad:</strong> {ad.fullName}
                    </p>
                  )}
                  <p>
                    <strong>Yaş:</strong> {ad.age} yaş
                  </p>
                  <p>
                    <strong>Təcrübə:</strong> {ad.experience}
                  </p>
                  <p>
                    <strong>İş forması:</strong> {ad.workForm === "online" ? "Online İş" : "Fiziki İş"}
                  </p>
                  {ad.region && ad.region !== "Fərqi yoxdur" && (
                    <p>
                      <strong>Bölgə:</strong> {ad.region}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {ad.fullName && !ad.hideMyName && (
                    <p>
                      <strong>Əlaqədar şəxs:</strong> {ad.fullName}
                    </p>
                  )}
                  <p>
                    <strong>Yaş aralığı:</strong> {ad.ageRange}
                  </p>
                  <p>
                    <strong>Tələb olunan təcrübə:</strong> {ad.experience}
                  </p>
                  <p>
                    <strong>İşçi forması:</strong> {ad.workerForm === "online" ? "Online İşçi" : "Fiziki İşçi"}
                  </p>
                  {ad.region && ad.region !== "Fərqi yoxdur" && (
                    <p>
                      <strong>Bölgə:</strong> {ad.region}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {ad.gender && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
                <i
                  className={`fa-solid ${ad.gender === "Kişi" ? "fa-mars" : ad.gender === "Qadın" ? "fa-venus" : "fa-user-group"} mr-2`}
                ></i>
                {ad.gender}
              </span>
            )}
            {ad.region && ad.region !== "Fərqi yoxdur" && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
                <i className="fa-solid fa-location-dot mr-2"></i>
                {ad.region}
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
              <i className="fa-solid fa-house-laptop mr-2"></i>
              {isJobSeeker
                ? ad.workForm === "online"
                  ? "Online İş"
                  : "Fiziki İş"
                : ad.workerForm === "online"
                  ? "Online İşçi"
                  : "Fiziki İşçi"}
            </span>
            {ad.age && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
                <i className="fa-solid fa-person mr-2"></i>
                {ad.age} yaş
              </span>
            )}
            {ad.ageRange && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
                <i className="fa-solid fa-person mr-2"></i>
                {ad.ageRange} yaş aralığı
              </span>
            )}
            {ad.experience && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-900 text-emerald-300">
                <i className="fa-solid fa-ranking-star mr-2"></i>
                {ad.experience} Təcrübə
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-600">
          <p className="text-sm font-semibold text-gray-300 mb-2">Əlaqə Məlumatları:</p>
          <div className="space-y-2 text-gray-400">
            <div className="flex items-center justify-between text-sm">
              <p className="flex items-center">
                <i className="fa-solid fa-phone mr-2 text-gray-500"></i>
                +994 ({ad.contactNumber || "Yoxdur"})
              </p>
              {ad.contactNumber && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openContactModal("phone", ad.contactNumber)
                  }}
                  className="text-xs font-semibold py-1 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition duration-150 shadow-md"
                >
                  Zəng Et
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="flex items-center">
                <i className="fa-solid fa-envelope mr-2 text-gray-500"></i>
                {ad.email || "Yoxdur"}
              </p>
              {ad.email && ad.email !== "E-poçt yoxdur" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openContactModal("email", ad.email)
                  }}
                  className="text-xs font-semibold py-1 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition duration-150 shadow-md"
                >
                  E-mail Göndər
                </button>
              ) : (
                <span className="text-xs text-red-400 italic">E-poçt yoxdur</span>
              )}
            </div>
            {ad.hideMyName && (
              <div className="flex items-center text-sm">
                <p className="flex items-center text-yellow-400">
                  <i className="fa-solid fa-user-secret mr-2"></i>
                  Bu istifadəçi adını gizli saxlamaq istəyir
                </p>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="mt-4 flex gap-2">
              {ad.contactNumber && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openContactModal("phone", ad.contactNumber)
                  }}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-150 flex items-center justify-center"
                >
                  <i className="fa-solid fa-phone mr-2"></i>
                  Zəng Et
                </button>
              )}
              {ad.email && ad.email !== "E-poçt yoxdur" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openContactModal("email", ad.email)
                  }}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-150 flex items-center justify-center"
                >
                  <i className="fa-solid fa-envelope mr-2"></i>
                  E-mail Göndər
                </button>
              )}
            </div>
          )}

          <p className="text-right text-xs date-text mt-2">
            <i className="fa-solid fa-clock mr-1"></i>
            {ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleString("az-AZ") : "Tarix yoxdur"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-900 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-extrabold text-white">
            <span className="text-emerald-500">axtarget</span>
            <span className="text-gray-500">.xyz</span>
          </h1>
          <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row items-center space-x-0 sm:space-x-4">
            <div className="text-xs text-center sm:text-right text-gray-500 mb-2 sm:mb-0">
              <p>Cari İstifadəçi ID-si:</p>
              <span className="font-mono text-gray-400 break-all">{user?.uid || "Yüklənir..."}</span>
            </div>

            <button
              onClick={() => window.open('https://github.com/ibadullahesen/app/releases/download/v1.0/AxtarGet.4.apk', '_blank')}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full transition duration-300 shadow-lg shadow-blue-600/50 ml-2 sm:ml-4"
            >
              <i className="fa-solid fa-download mr-2"></i>
              Proqramımızı Yüklə
            </button>
            
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-full transition duration-300 shadow-lg shadow-emerald-600/50"
            >
              <i className="fa-solid fa-square-plus mr-2"></i>
              Elan Paylaş
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full shadow-xl p-1 bg-gray-900 border border-gray-700">
            <button
              onClick={() => setCurrentView("all")}
              className={`tab-button inline-flex items-center px-6 py-3 text-sm font-medium text-gray-300 rounded-full transition duration-300 hover:bg-gray-800 hover:text-emerald-500 ${currentView === "all" ? "active" : ""}`}
            >
              <i className="fa-solid fa-list-ul mr-2"></i>
              Hamısı
            </button>
            <button
              onClick={() => setCurrentView("job_seeker")}
              className={`tab-button inline-flex items-center px-6 py-3 text-sm font-medium text-gray-300 rounded-full transition duration-300 hover:bg-gray-800 hover:text-emerald-500 ${currentView === "job_seeker" ? "active" : ""}`}
            >
              <i className="fa-solid fa-user-tag mr-2"></i>
              İş Axtaran
            </button>
            <button
              onClick={() => setCurrentView("employer")}
              className={`tab-button inline-flex items-center px-6 py-3 text-sm font-medium text-gray-300 rounded-full transition duration-300 hover:bg-gray-800 hover:text-emerald-500 ${currentView === "employer" ? "active" : ""}`}
            >
              <i className="fa-solid fa-hard-hat mr-2"></i>
              İşçi Axtaran
            </button>
          </div>
        </div>

        {/* Listings Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.length === 0 ? (
            <div className="col-span-full p-10 text-center bg-gray-800 rounded-xl shadow-inner border border-dashed border-gray-700">
              <i className="fa-solid fa-cloud-moon text-6xl text-gray-600 mb-4"></i>
              <p className="text-xl font-semibold text-gray-400">
                {jobAds.length === 0
                  ? "Elanlar yüklənir..."
                  : `Hələlik aktiv ${currentView === "job_seeker" ? "iş axtaran" : currentView === "employer" ? "işçi axtaran" : ""} elanı yoxdur.`}
              </p>
              {jobAds.length > 0 && <p className="text-gray-500">Yeni elan əlavə edərək başlaya bilərsiniz.</p>}
            </div>
          ) : (
            <>
              <h2 className="col-span-full text-2xl font-bold text-gray-100 mb-6 border-b border-gray-700 pb-2">
                {currentView === "all"
                  ? "Bütün Elanlar"
                  : currentView === "job_seeker"
                    ? "İş Axtaran Elanları"
                    : "İşçi Axtaran Elanları"}
              </h2>
              {filteredAds.map(renderAdCard)}
            </>
          )}
        </div>
      </main>

      {/* Post Ad Modal */}
      {isPostModalOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-700 p-6 sm:p-8">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-100 flex items-center">
                <i className="fa-solid fa-bullhorn mr-3 text-emerald-500"></i>
                Yeni Elan Paylaş
              </h2>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-gray-400 hover:text-gray-200 transition"
              >
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>

            {/* Form Tabs */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-700 p-1 bg-gray-800">
                <button
                  onClick={() => setCurrentFormType("job_seeker")}
                  className={`tab-button px-4 py-2 text-sm font-medium text-gray-300 rounded-lg transition duration-300 hover:bg-gray-700 ${currentFormType === "job_seeker" ? "active" : ""}`}
                >
                  <i className="fa-solid fa-user-tag mr-2"></i>
                  İş Axtaranam
                </button>
                <button
                  onClick={() => setCurrentFormType("employer")}
                  className={`tab-button px-4 py-2 text-sm font-medium text-gray-300 rounded-lg transition duration-300 hover:bg-gray-700 ${currentFormType === "employer" ? "active" : ""}`}
                >
                  <i className="fa-solid fa-hard-hat mr-2"></i>
                  İşçi Axtarıram
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitAd} className="space-y-6">
              {currentFormType === "job_seeker" ? (
                <>
                  <h3 className="text-lg font-semibold text-emerald-500 border-b border-gray-700 pb-2 mb-4">
                    İş Axtaran Elan Formu
                  </h3>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                      1.Əlaqə Nömrən <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg select-none">
                        +994
                      </span>
                      <input
                        type="text"
                        name="contactNumber"
                        required
                        pattern="\d{2}-\d{3}-\d{2}-\d{2}"
                        placeholder="XX-XXX-XX-XX"
                        onChange={(e) => (e.target.value = formatPhoneNumber(e.target.value))}
                        className="flex-1 block w-full rounded-none rounded-r-lg border-gray-600 focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center h-12">
                    <input
                      type="checkbox"
                      id="hide-phone-js"
                      onChange={(e) => {
                        const phoneInput = document.querySelector('input[name="contactNumber"]') as HTMLInputElement
                        if (e.target.checked) {
                          phoneInput.value = "Paylaşmaq istəmirəm"
                          phoneInput.disabled = true
                          phoneInput.required = false
                        } else {
                          phoneInput.value = ""
                          phoneInput.disabled = false
                          phoneInput.required = true
                        }
                      }}
                      className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                    />
                    <label
                      htmlFor="hide-phone-js"
                      className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                    >
                      Nömrəmi paylaşmaq istəmirəm
                    </label>
                  </div>
                </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        2. E-posta Adresin <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="adiniz@misal.com"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-email-js"
                        onChange={(e) => {
                          const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
                          if (e.target.checked) {
                            emailInput.value = "E-poçt yoxdur"
                            emailInput.disabled = true
                            emailInput.required = false
                          } else {
                            emailInput.value = ""
                            emailInput.disabled = false
                            emailInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-email-js"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        E-poçtum yoxdur
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        3. Bacarıqlar (Aralarına vergül qoyun) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="skills"
                        required
                        placeholder="Məs: JS, React, SMM"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-skills-js"
                        onChange={(e) => {
                          const skillsInput = document.querySelector('input[name="skills"]') as HTMLInputElement
                          if (e.target.checked) {
                            skillsInput.value = "Bacarığım yoxdur"
                            skillsInput.disabled = true
                            skillsInput.required = false
                          } else {
                            skillsInput.value = ""
                            skillsInput.disabled = false
                            skillsInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-skills-js"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Bacarığım yoxdur
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-2">
                      4. Hansı formada iş axdarırsan?
                    </label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          id="js-online"
                          name="workForm"
                          type="radio"
                          value="online"
                          defaultChecked
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="js-online" className="ml-2 text-sm font-medium text-gray-300">
                          Online
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="js-fiziki"
                          name="workForm"
                          type="radio"
                          value="fiziki"
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="js-fiziki" className="ml-2 text-sm font-medium text-gray-300">
                          Fiziki
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-1">
                      5. Axtardığın İş (Vəzifə) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      required
                      placeholder="Məs: Kiçik Frontend Developer"
                      className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                    />
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-2">
                      6. Cinsiniz <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          id="js-gender-male"
                          name="gender"
                          type="radio"
                          value="Kişi"
                          required
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="js-gender-male" className="ml-2 text-sm font-medium text-gray-300">
                          Kişi
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="js-gender-female"
                          name="gender"
                          type="radio"
                          value="Qadın"
                          required
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="js-gender-female" className="ml-2 text-sm font-medium text-gray-300">
                          Qadın
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-1">
                      7. Yaşın <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="age"
                      required
                      min="18"
                      max="99"
                      placeholder="Məs: 25"
                      className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                    />
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-1">
                      8. İş Təcrübən (neçə il) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="experience"
                      required
                      className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                    >
                      <option value="Yoxdur">Yoxdur (Təcrübəsiz)</option>
                      <option value="1 il">1 il</option>
                      <option value="2 il">2 il</option>
                      <option value="3 il">3 il</option>
                      <option value="4 il">4 il</option>
                      <option value="5+ il">5+ il</option>
                    </select>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        9. Hansı bölgədə iş axtarırsan? <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="region"
                        required
                        placeholder="Məs: Bakı, Nərimanov"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-region-js"
                        defaultChecked
                        onChange={(e) => {
                          const regionInput = document.querySelector('input[name="region"]') as HTMLInputElement
                          if (e.target.checked) {
                            regionInput.value = "Fərqi yoxdur"
                            regionInput.disabled = true
                            regionInput.required = false
                          } else {
                            regionInput.value = ""
                            regionInput.disabled = false
                            regionInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-region-js"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Fərqi yoxdur
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        10. Adın <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        placeholder="Məs: Əli Məmmədov"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="hide-name-js"
                        name="hideMyName"
                        value="true"
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="hide-name-js"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Adımı vermək istəmirəm
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-emerald-500 border-b border-gray-700 pb-2 mb-4">
                    İşçi Axtaran Elan Formu
                  </h3>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        1. Şirkət Adı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="company"
                        required
                        placeholder="Məs: Axtarget MMC"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-company-em"
                        onChange={(e) => {
                          const companyInput = document.querySelector('input[name="company"]') as HTMLInputElement
                          if (e.target.checked) {
                            companyInput.value = "Şəxsi Elan"
                            companyInput.disabled = true
                            companyInput.required = false
                          } else {
                            companyInput.value = ""
                            companyInput.disabled = false
                            companyInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-company-em"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Şəxsi Elan
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-1">
                      2. Tələb olunan Təcrübə (il) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="experience"
                      required
                      className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                    >
                      <option value="Təcrübəsiz">Təcrübəsiz</option>
                      <option value="1 il">1 il</option>
                      <option value="2 il">2 il</option>
                      <option value="3 il">3 il</option>
                      <option value="4+ il">4+ il</option>
                    </select>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        3. E-posta Adresi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="hr@sirket.az"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-email-em"
                        onChange={(e) => {
                          const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
                          if (e.target.checked) {
                            emailInput.value = "E-poçt yoxdur"
                            emailInput.disabled = true
                            emailInput.required = false
                          } else {
                            emailInput.value = ""
                            emailInput.disabled = false
                            emailInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-email-em"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        E-poçtum yoxdur
                      </label>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label block text-sm font-medium mb-1">
                      4.Əlaqə Nömrəniz <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg select-none">
                        +994
                      </span>
                      <input
                        type="text"
                        name="contactNumber"
                        required
                        pattern="\d{2}-\d{3}-\d{2}-\d{2}"
                        placeholder="XX-XXX-XX-XX"
                        onChange={(e) => (e.target.value = formatPhoneNumber(e.target.value))}
                        className="flex-1 block w-full rounded-none rounded-r-lg border-gray-600 focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-2">
                      5. Axtardığınız İşçinin Cinsi <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          id="em-gender-male"
                          name="gender"
                          type="radio"
                          value="Kişi"
                          required
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="em-gender-male" className="ml-2 text-sm font-medium text-gray-300">
                          Kişi
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="em-gender-female"
                          name="gender"
                          type="radio"
                          value="Qadın"
                          required
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="em-gender-female" className="ml-2 text-sm font-medium text-gray-300">
                          Qadın
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="em-gender-any"
                          name="gender"
                          type="radio"
                          value="Fərqi yoxdur"
                          defaultChecked
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="em-gender-any" className="ml-2 text-sm font-medium text-gray-300">
                          Fərqi yoxdur
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-2">6. Axtardığınız İşçi Forması</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          id="em-fiziki"
                          name="workerForm"
                          type="radio"
                          value="fiziki"
                          defaultChecked
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="em-fiziki" className="ml-2 text-sm font-medium text-gray-300">
                          Fiziki
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="em-online"
                          name="workerForm"
                          type="radio"
                          value="online"
                          className="h-4 w-4 text-emerald-500 border-gray-600 focus:ring-emerald-500 bg-gray-800"
                        />
                        <label htmlFor="em-online" className="ml-2 text-sm font-medium text-gray-300">
                          Online
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        7. Axtardığınız Bölgə <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="region"
                        required
                        placeholder="Məs: Bakı, Xətai"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-region-em"
                        defaultChecked
                        onChange={(e) => {
                          const regionInput = document.querySelector('input[name="region"]') as HTMLInputElement
                          if (e.target.checked) {
                            regionInput.value = "Fərqi yoxdur"
                            regionInput.disabled = true
                            regionInput.required = false
                          } else {
                            regionInput.value = ""
                            regionInput.disabled = false
                            regionInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-region-em"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Fərqi yoxdur
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="input-label block text-sm font-medium mb-1">
                      8. Yaş Aralığı <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="ageRange"
                      required
                      className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                    >
                      <option value="18-26">18-26</option>
                      <option value="26-35">26-35</option>
                      <option value="35+">35+</option>
                    </select>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        9. Axtardığınız Sahə/Biliklər (İşçinin biliyi nə olmalıdır?){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="requiredSkills"
                        required
                        rows={3}
                        placeholder="Məs: React, Node.js, Mükəmməl Azərbaycan dili"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200 resize-y"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="no-skills-em"
                        defaultChecked
                        onChange={(e) => {
                          const skillsInput = document.querySelector(
                            'textarea[name="requiredSkills"]',
                          ) as HTMLTextAreaElement
                          if (e.target.checked) {
                            skillsInput.value = "Fərqi yoxdur"
                            skillsInput.disabled = true
                            skillsInput.required = false
                          } else {
                            skillsInput.value = ""
                            skillsInput.disabled = false
                            skillsInput.required = true
                          }
                        }}
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="no-skills-em"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Fərqi yoxdur
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="input-label block text-sm font-medium mb-1">
                        10. Adınız <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        placeholder="Məs: Rəşad Əliyev"
                        className="block w-full border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 p-3 shadow-sm text-base bg-gray-800 text-gray-200"
                      />
                    </div>
                    <div className="flex items-center h-12">
                      <input
                        type="checkbox"
                        id="hide-name-em"
                        name="hideMyName"
                        value="true"
                        className="h-4 w-4 text-emerald-500 border-gray-600 rounded focus:ring-emerald-500 bg-gray-800"
                      />
                      <label
                        htmlFor="hide-name-em"
                        className="ml-2 block text-sm font-medium text-gray-300 whitespace-nowrap"
                      >
                        Adımı vermək istəmirəm
                      </label>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ring-offset-gray-900"
              >
                Elanı Paylaş
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold text-emerald-500 mb-3">{alertModal.title}</h3>
            <p className="text-gray-300 mb-6">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition duration-150"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Contact Confirmation Modal */}
      {isContactModalOpen && contactAction && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold text-emerald-500 mb-3 flex items-center">
              {contactAction.type === "phone" ? "Zəng Təsdiqi" : "E-mail Təsdiqi"}
            </h3>
            <p className="text-gray-300 mb-6">
              {contactAction.type === "phone"
                ? `Siz +994 (${contactAction.value}) nömrəsinə zəng etmək istəyirsiniz?`
                : `Siz ${contactAction.value} ünvanına e-mail göndərmək istəyirsiniz?`}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition duration-150"
              >
                Xeyr
              </button>
              <button
                onClick={handleContactAction}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition duration-150"
              >
                Bəli
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 w-full max-w-sm rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-bold text-red-500 mb-3 flex items-center">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>
              Silmə Təsdiqi
            </h3>
            <p className="text-gray-300 mb-6">
              Bu elanı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmazdır.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition duration-150"
              >
                Ləğv Et
              </button>
              <button
                onClick={handleDeleteAd}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-150"
              >
                Əminəm, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
