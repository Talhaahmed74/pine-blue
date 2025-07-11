
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const PaymentSettings = () => {
  const [stripeKey, setStripeKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(true);
  

  useEffect(() => {
    // Check if Stripe key is already configured
    checkStripeConfiguration();
  }, []);

  const checkStripeConfiguration = async () => {
    try {
      // This is a simple check - in a real app you'd call your backend
      const savedKey = localStorage.getItem('stripe_configured');
      setIsKeySet(!!savedKey);
    } catch (error) {
      console.error('Error checking Stripe configuration:', error);
    }
  };

  const handleSaveKey = async () => {
    if (!stripeKey.trim()) {
      toast.error('Please enter your Stripe secret key');
      return;
    }

    if (!stripeKey.startsWith('sk_')) {
      toast.error('Invalid Stripe key format. It should start with "sk_"');
      return;
    }

    setLoading(true);
    try {
      // In a real application, you would securely send this to your backend
      // For demo purposes, we'll just simulate the save
      localStorage.setItem('stripe_configured', 'true');
      setIsKeySet(true);
      setStripeKey('');
      toast.success('Stripe key configured successfully!');
    } catch (error: any) {
      toast.error('Failed to save Stripe key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('stripe_configured');
    setIsKeySet(false);
    toast.success('Stripe key removed successfully');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Gateway Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Stripe Payment Gateway</h3>
              <p className="text-sm text-gray-600">Configure your Stripe secret key for payment processing</p>
            </div>
            <Badge variant={isKeySet ? "default" : "secondary"} className="flex items-center gap-1">
              {isKeySet ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Configured
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>

          {!isKeySet ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="stripe-key">Stripe Secret Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="stripe-key"
                    type="password"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    placeholder="sk_test_... or sk_live_..."
                    className="flex-1"
                  />
                  <Button onClick={handleSaveKey} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your Stripe secret key from the{' '}
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Stripe Dashboard
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800 font-medium">Stripe is configured and ready!</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemoveKey}>
                  Remove Key
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Test Payment Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-3">
              Use these test card numbers during development:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-mono text-sm">4242 4242 4242 4242</div>
                <div className="text-xs text-gray-600">Visa - Success</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-mono text-sm">4000 0000 0000 0002</div>
                <div className="text-xs text-gray-600">Visa - Declined</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-mono text-sm">5555 5555 5555 4444</div>
                <div className="text-xs text-gray-600">Mastercard - Success</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-mono text-sm">4000 0025 0000 3155</div>
                <div className="text-xs text-gray-600">Requires Authentication</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Use any future expiry date, any 3-digit CVC, and any postal code.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSettings;
