            if (data.success) {
              // Store in sessionStorage (tab-specific)
              sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));
              sessionStorage.setItem('userName', name);
              sessionStorage.setItem('userPhone', mobileNumber);

              // Refresh profile data
              await refreshProfile();
              console.log('Profile refreshed after new account creation.');

              toast.success('Account created successfully!');
              setIsLoading(false);
              // Add a small delay before navigation
              setTimeout(() => {
                navigate('/customerdashboard', { replace: true });
              }, 100);
            } else {
              throw new Error(data.error || 'Failed to create account');
            }
          } catch (error) {
            console.error('Error creating user account:', error);
            toast.error('Failed to create account. Please try again.');
            setIsLoading(false);
            return;
          }
        } else {
          // For existing users, fetch and load their profile data
          try {
            console.log('Fetching existing user profile...');
            const response = await fetch(`/api/users/${mobileNumber}`);
            
            if (!response.ok) {
              throw new Error('Failed to fetch user profile');
            }

            const data = await response.json();
            
            if (data.success) {
              const userProfile = data.profile;
              
              // Store in sessionStorage (tab-specific)
              sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
              sessionStorage.setItem('userName', userProfile.name);
              sessionStorage.setItem('userPhone', userProfile.mobile);

              // Update last login time
              await fetch(`/api/users/${mobileNumber}/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  lastLogin: new Date().toISOString()
                }),
              });
              console.log('Last login time updated.');

              // Refresh profile data
              await refreshProfile();
              console.log('Profile refreshed after existing user login.');

              toast.success('Login successful!');
              setIsLoading(false);
              // Add a small delay before navigation
              setTimeout(() => {
                navigate('/customerdashboard', { replace: true });
              }, 100);
            } else {
              console.error('User profile not found');
              toast.error('User profile not found. Please try again.');
            }
          } catch (error) {
            console.error('Error handling user profile:', error);
            toast.error('Failed to load user profile. Please try again.');
          }
        }
      } else {
        toast.error(result.error || 'Invalid OTP. Please try again.');
      } finally {
        // Ensure isLoading is false even if something else failed before explicit setting
        // The original logic was to set isLoading to false inside specific success/error blocks.
        // This ensures it's always false at the end of the handleSubmit attempt.
        if (isLoading) {
          setIsLoading(false);
        }
        console.log('handleSubmit finally block executed. isLoading:', isLoading);
      } 