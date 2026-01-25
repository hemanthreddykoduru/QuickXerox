// Fetch user's current IP address
export const getCurrentIP = async (): Promise<string | null> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to fetch IP:', error);
        return null;
    }
};

// Check if an IP matches a CIDR range or exact IP
export const isIPAllowed = (userIP: string, allowedRanges: string[]): boolean => {
    if (!allowedRanges || allowedRanges.length === 0) {
        // If no IP restrictions configured, allow all
        return true;
    }

    for (const range of allowedRanges) {
        // Check exact match
        if (range === userIP) {
            return true;
        }

        // Check CIDR range (basic implementation)
        if (range.includes('/')) {
            const [rangeIP, maskBits] = range.split('/');
            if (ipMatchesCIDR(userIP, rangeIP, parseInt(maskBits))) {
                return true;
            }
        }
    }

    return false;
};

// Simple CIDR matching
const ipMatchesCIDR = (ip: string, rangeIP: string, maskBits: number): boolean => {
    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(rangeIP);
    const mask = -1 << (32 - maskBits);

    return (ipNum & mask) === (rangeNum & mask);
};

const ipToNumber = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};
