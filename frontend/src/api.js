import axios from 'axios'

const api = axios.create({
  baseURL: 'https://vendoriq-backend-5iof.onrender.com/api',
})

export default api