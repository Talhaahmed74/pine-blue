import React, { createContext, useContext, useReducer, ReactNode, useRef } from 'react'

// ---------- Types ----------
interface RoomStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

interface RoomState {
  rooms: any[]
  loading: boolean
  searchTerm: string
  searchResults: any[]
  isSearchMode: boolean
  currentPage: number
  hasMoreRooms: boolean
  totalCount: number
  roomStats: RoomStats
  statsLoading: boolean
  statusUpdating: Record<string, boolean>
  activeStatusFilter: string | null
  isLoadingMore: boolean
}

interface BookingState {
  stats: any[]
  recentBookings: any[]
  isLoading: boolean
  searchTerm: string
  page: number
  hasMoreBookings: boolean
  searchPage: number
  hasMoreSearchResults: boolean
  isSearchMode: boolean
  isLoadingMoreSearch: boolean
  searchResults: any[]
}

interface AppState {
  room: RoomState
  booking: BookingState
}

// ---------- Actions ----------
type RoomAction =
  | { type: 'SET_ROOMS'; payload: any[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: any[] }
  | { type: 'SET_SEARCH_MODE'; payload: boolean }
  | { type: 'SET_ROOM_STATS'; payload: RoomStats }
  | { type: 'SET_STATS_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_HAS_MORE_ROOMS'; payload: boolean }
  | { type: 'SET_TOTAL_COUNT'; payload: number }
  | { type: 'LOAD_MORE_ROOMS'; payload: { rooms: any[]; page: number; hasMore: boolean } }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_ROOM_STATUS'; payload: { room_number: string; status: string } }
  | { type: 'APPEND_ROOM_DATA'; payload: any[] }
  | { type: 'SET_STATUS_UPDATING'; payload: { room_number: string; isUpdating: boolean } }
  | { type: 'SET_ACTIVE_STATUS_FILTER'; payload: string | null }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'UPDATE_ROOM_STATS_AFTER_STATUS_CHANGE'; payload: { oldStatus: string; newStatus: string } }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'CLEAR_FILTER' }

type BookingAction =
  | { type: 'SET_STATS'; payload: any[] }
  | { type: 'SET_RECENT_BOOKINGS'; payload: any[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_HAS_MORE_BOOKINGS'; payload: boolean }
  | { type: 'SET_SEARCH_PAGE'; payload: number }
  | { type: 'SET_HAS_MORE_SEARCH_RESULTS'; payload: boolean }
  | { type: 'SET_SEARCH_MODE'; payload: boolean }
  | { type: 'SET_LOADING_MORE_SEARCH'; payload: boolean }
  | { type: 'LOAD_MORE_BOOKINGS'; payload: { bookings: any[]; page: number } }
  | { type: 'UPDATE_BOOKING'; payload: any }
  | { type: 'DELETE_BOOKING'; payload: string }
  | { type: 'RESET_STATE' }
  | { type: 'SET_SEARCH_RESULTS'; payload: any[] }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'LOAD_MORE_SEARCH_RESULTS'; payload: { results: any[]; page: number; hasMore: boolean } }

type AppAction =
  | { type: `ROOM_${RoomAction['type']}`; payload?: any }
  | { type: `BOOKING_${BookingAction['type']}`; payload?: any }

interface AppStateContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

// ---------- Initial States ----------
const initialRoomState: RoomState = {
  rooms: [],
  loading: true,
  searchTerm: '',
  searchResults: [],
  isSearchMode: false,
  currentPage: 1,
  hasMoreRooms: true,
  totalCount: 0,
  roomStats: { total: 0, available: 0, occupied: 0, maintenance: 0 },
  statsLoading: true,
  statusUpdating: {},
  activeStatusFilter: null,
  isLoadingMore: false
}

const initialBookingState: BookingState = {
  stats: [],
  recentBookings: [],
  isLoading: true,
  searchTerm: '',
  page: 0,
  hasMoreBookings: true,
  searchPage: 0,
  hasMoreSearchResults: true,
  isSearchMode: false,
  isLoadingMoreSearch: false,
  searchResults: []
}

const initialState: AppState = {
  room: initialRoomState,
  booking: initialBookingState
}

// ---------- Reducer ----------
const appStateReducer = (state: AppState, action: AppAction): AppState => {
  const { type, payload } = action

  if (type.startsWith('ROOM_')) {
    const roomType = type.replace('ROOM_', '') as RoomAction['type']

    switch (roomType) {
      case 'SET_ROOMS':
        return { ...state, room: { ...state.room, rooms: payload, loading: false } }
      
      case 'SET_LOADING':
        return { ...state, room: { ...state.room, loading: payload } }
      
      case 'SET_SEARCH_TERM':
        return { ...state, room: { ...state.room, searchTerm: payload } }
      
      case 'SET_SEARCH_RESULTS':
        return { 
          ...state, 
          room: { 
            ...state.room, 
            searchResults: payload,
            isSearchMode: payload.length > 0 || state.room.searchTerm.length > 0
          } 
        }
      
      case 'SET_SEARCH_MODE':
        return { ...state, room: { ...state.room, isSearchMode: payload } }
      
      case 'CLEAR_SEARCH':
        return {
          ...state,
          room: {
            ...state.room,
            searchTerm: '',
            searchResults: [],
            isSearchMode: false
          }
        }
      
      case 'SET_ROOM_STATS':
        return { ...state, room: { ...state.room, roomStats: payload, statsLoading: false } }
      
      case 'SET_STATS_LOADING':
        return { ...state, room: { ...state.room, statsLoading: payload } }
      
      case 'SET_CURRENT_PAGE':
        return { ...state, room: { ...state.room, currentPage: payload } }
      
      case 'SET_HAS_MORE_ROOMS':
        return { ...state, room: { ...state.room, hasMoreRooms: payload } }
      
      case 'SET_TOTAL_COUNT':
        return { ...state, room: { ...state.room, totalCount: payload } }
      
      case 'SET_LOADING_MORE':
        return { ...state, room: { ...state.room, isLoadingMore: payload } }
      
      case 'SET_ACTIVE_STATUS_FILTER':
        return { 
          ...state, 
          room: { 
            ...state.room, 
            activeStatusFilter: payload,
            // Clear search when setting filter
            searchTerm: '',
            searchResults: [],
            isSearchMode: false
          } 
        }
      
      case 'CLEAR_FILTER':
        return {
          ...state,
          room: {
            ...state.room,
            activeStatusFilter: null
          }
        }

      case 'LOAD_MORE_ROOMS':
        return {
          ...state,
          room: {
            ...state.room,
            rooms: [...state.room.rooms, ...payload.rooms],
            currentPage: payload.page,
            hasMoreRooms: payload.hasMore,
            isLoadingMore: false
          }
        }

      case 'UPDATE_ROOM_STATUS':
        // Find the old status before updating
        const roomToUpdate = state.room.rooms.find(r => r.room_number === payload.room_number);
        const oldStatus = roomToUpdate?.status;
        
        return {
          ...state,
          room: {
            ...state.room,
            rooms: state.room.rooms.map(r =>
              r.room_number === payload.room_number ? { ...r, status: payload.status } : r
            ),
            searchResults: state.room.searchResults.map(r =>
              r.room_number === payload.room_number ? { ...r, status: payload.status } : r
            ),
            // Update stats optimistically
            roomStats: oldStatus ? updateStatsAfterStatusChange(state.room.roomStats, oldStatus, payload.status) : state.room.roomStats
          }
        }

      case 'UPDATE_ROOM_STATS_AFTER_STATUS_CHANGE':
        return {
          ...state,
          room: {
            ...state.room,
            roomStats: updateStatsAfterStatusChange(state.room.roomStats, payload.oldStatus, payload.newStatus)
          }
        }

      case 'APPEND_ROOM_DATA':
        return {
          ...state,
          room: { ...state.room, rooms: [...state.room.rooms, ...payload] }
        }

      case 'SET_STATUS_UPDATING':
        return {
          ...state,
          room: {
            ...state.room,
            statusUpdating: {
              ...state.room.statusUpdating,
              [payload.room_number]: payload.isUpdating
            }
          }
        }

      case 'RESET_STATE':
        return { ...state, room: initialRoomState }

      default:
        return state
    }
  }

  if (type.startsWith('BOOKING_')) {
    const bookingType = type.replace('BOOKING_', '') as BookingAction['type']

    switch (bookingType) {
      case 'SET_STATS':
        return { ...state, booking: { ...state.booking, stats: payload } }
      
      case 'SET_RECENT_BOOKINGS':
        return { ...state, booking: { ...state.booking, recentBookings: payload, isLoading: false } }
      
      case 'SET_LOADING':
        return { ...state, booking: { ...state.booking, isLoading: payload } }
      
      case 'SET_SEARCH_TERM':
        return { ...state, booking: { ...state.booking, searchTerm: payload } }
      
      case 'SET_SEARCH_RESULTS':
        return { 
          ...state, 
          booking: { 
            ...state.booking, 
            searchResults: payload,
            isSearchMode: payload.length > 0 || state.booking.searchTerm.length > 0
          } 
        }
      
      case 'CLEAR_SEARCH':
        return {
          ...state,
          booking: {
            ...state.booking,
            searchTerm: '',
            searchResults: [],
            isSearchMode: false,
            searchPage: 0,
            hasMoreSearchResults: true
          }
        }
      
      case 'SET_PAGE':
        return { ...state, booking: { ...state.booking, page: payload } }
      
      case 'SET_HAS_MORE_BOOKINGS':
        return { ...state, booking: { ...state.booking, hasMoreBookings: payload } }
      
      case 'SET_SEARCH_PAGE':
        return { ...state, booking: { ...state.booking, searchPage: payload } }
      
      case 'SET_HAS_MORE_SEARCH_RESULTS':
        return { ...state, booking: { ...state.booking, hasMoreSearchResults: payload } }
      
      case 'SET_SEARCH_MODE':
        return { ...state, booking: { ...state.booking, isSearchMode: payload } }
      
      case 'SET_LOADING_MORE_SEARCH':
        return { ...state, booking: { ...state.booking, isLoadingMoreSearch: payload } }

      case 'LOAD_MORE_BOOKINGS':
        return {
          ...state,
          booking: {
            ...state.booking,
            recentBookings: [...state.booking.recentBookings, ...payload.bookings],
            page: payload.page
          }
        }

      case 'LOAD_MORE_SEARCH_RESULTS':
        return {
          ...state,
          booking: {
            ...state.booking,
            searchResults: [...state.booking.searchResults, ...payload.results],
            searchPage: payload.page,
            hasMoreSearchResults: payload.hasMore,
            isLoadingMoreSearch: false
          }
        }

      case 'UPDATE_BOOKING':
        return {
          ...state,
          booking: {
            ...state.booking,
            recentBookings: state.booking.recentBookings.map(b =>
              b.booking_id === payload.booking_id ? payload : b
            ),
            searchResults: state.booking.searchResults.map(b =>
              b.booking_id === payload.booking_id ? payload : b
            )
          }
        }

      case 'DELETE_BOOKING':
        return {
          ...state,
          booking: {
            ...state.booking,
            recentBookings: state.booking.recentBookings.filter(b => b.booking_id !== payload),
            searchResults: state.booking.searchResults.filter(b => b.booking_id !== payload)
          }
        }

      case 'RESET_STATE':
        return { ...state, booking: initialBookingState }

      default:
        return state
    }
  }

  return state
}

// Helper function to update stats after status change
function updateStatsAfterStatusChange(stats: RoomStats, oldStatus: string, newStatus: string): RoomStats {
  const newStats = { ...stats };
  
  // Decrease old status count
  if (oldStatus === 'Available') newStats.available = Math.max(0, newStats.available - 1);
  else if (oldStatus === 'Occupied') newStats.occupied = Math.max(0, newStats.occupied - 1);
  else if (oldStatus === 'Maintenance') newStats.maintenance = Math.max(0, newStats.maintenance - 1);
  
  // Increase new status count
  if (newStatus === 'Available') newStats.available++;
  else if (newStatus === 'Occupied') newStats.occupied++;
  else if (newStatus === 'Maintenance') newStats.maintenance++;
  
  return newStats;
}

// ---------- Context Provider ----------
const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState)
  const isInitialMount = useRef(true)

  // Remove sessionStorage hydration - causes stale data issues
  // Data should be fresh on each mount

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>
}

// ---------- Hooks ----------
export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (!context) throw new Error('useAppState must be used within AppStateProvider')
  return context
}

export const useRoomState = () => {
  const { state, dispatch } = useAppState()
  return {
    roomState: state.room,
    dispatchRoom: (action: RoomAction) =>
      dispatch({ ...action, type: `ROOM_${action.type}` as any })
  }
}

export const useBookingState = () => {
  const { state, dispatch } = useAppState()
  return {
    bookingState: state.booking,
    dispatchBooking: (action: BookingAction) =>
      dispatch({ ...action, type: `BOOKING_${action.type}` as any })
  }
}