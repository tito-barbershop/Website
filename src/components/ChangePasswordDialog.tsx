import { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReauthenticate = async () => {
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        setNeedsReauth(false);
        setCurrentPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setNeedsReauth(true);
        setError('');
      } else {
        setError(err.message || 'Failed to update password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Password</h2>
          <p className="text-gray-600 mb-6">Update your password to something more secure</p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded p-4 text-green-800">
              Password updated successfully!
            </div>
          ) : needsReauth ? (
            <form onSubmit={(e) => { e.preventDefault(); handleReauthenticate(); }} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                For security, please verify your current password to change it.
              </p>
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Verify
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Change Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
