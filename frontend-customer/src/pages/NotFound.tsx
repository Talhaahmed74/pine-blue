import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Hotel, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Hotel className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Sorry, the page you're looking for doesn't exist or has been moved.</p>
          <Link to="/book-room">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Booking
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default NotFound
