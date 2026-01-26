import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, Eye, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface EmailTemplate {
    subject: string;
    body: string;
}

interface TemplatesMap {
    [key: string]: EmailTemplate;
}

const DEFAULT_TEMPLATES: TemplatesMap = {
    'SELLER_INVITE': {
        subject: 'Invitation to join QuickXerox Partner Newtork',
        body: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickXerox Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to QuickXerox!</h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Join India's Leading Print Network</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>{{name}}</strong>,</p>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You've been invited to join QuickXerox as a print shop partner!</p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="{{link}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    },
    'ORDER_CONFIRMATION': {
        subject: 'Order Confirmation - #{{orderId}}',
        body: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Order Confirmed!</h1>
                            <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">Order #{{orderId}}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>{{name}}</strong>,</p>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Thank you for your order! We've received your request and are processing it.</p>
                            
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">Order Details</h3>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 5px 0; color: #6b7280;">Order ID:</td>
                                        <td style="padding: 5px 0; color: #111827; font-weight: 600; text-align: right;">#{{orderId}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #6b7280;">Date:</td>
                                        <td style="padding: 5px 0; color: #111827; font-weight: 600; text-align: right;">{{date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; color: #6b7280;">Total Amount:</td>
                                        <td style="padding: 5px 0; color: #16a34a; font-weight: 700; text-align: right;">₹{{amount}}</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You will receive another email when your order is ready for pickup/delivery.</p>
                            
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="{{link}}" style="background: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">Track Order</a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Questions? Contact us at <a href="mailto:support@quickxerox.com" style="color: #10b981; text-decoration: none;">support@quickxerox.com</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    }
};

const TEMPLATE_OPTIONS = [
    { id: 'SELLER_INVITE', name: 'Seller Invitation' },
    { id: 'ORDER_CONFIRMATION', name: 'Order Confirmation' }
];

const AdminEmailTemplates = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATE_OPTIONS[0].id);
    const [templates, setTemplates] = useState<TemplatesMap>(DEFAULT_TEMPLATES);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const docRef = doc(db, 'systemSettings', 'general');
            const snapshot = await getDoc(docRef);
            if (snapshot.exists() && snapshot.data().emailTemplates) {
                setTemplates(prev => ({
                    ...prev,
                    ...snapshot.data().emailTemplates
                }));
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, 'systemSettings', 'general');
            await updateDoc(docRef, {
                emailTemplates: templates
            });
            toast.success('Templates saved successfully');
        } catch (error) {
            console.error('Error saving templates:', error);
            toast.error('Failed to save templates');
        } finally {
            setSaving(false);
        }
    };

    const currentTemplate = templates[selectedTemplateId] || { subject: '', body: '' };

    const updateCurrentTemplate = (field: 'subject' | 'body', value: string) => {
        setTemplates(prev => ({
            ...prev,
            [selectedTemplateId]: {
                ...prev[selectedTemplateId],
                [field]: value
            }
        }));
    };

    const resetToDefault = () => {
        if (confirm('Are you sure you want to reset this template to default?')) {
            setTemplates(prev => ({
                ...prev,
                [selectedTemplateId]: DEFAULT_TEMPLATES[selectedTemplateId] || prev[selectedTemplateId]
            }));
            toast.success('Reset to default');
        }
    };

    const getPreviewHtml = () => {
        let html = currentTemplate.body;
        // Replace placeholders with dummy data for preview
        html = html.replace(/{{name}}/g, 'John Doe')
            .replace(/{{shop_name}}/g, 'John\'s Print Shop')
            .replace(/{{link}}/g, '#')
            .replace(/{{invitation_link}}/g, '#')
            .replace(/{{orderId}}/g, '12345')
            .replace(/{{amount}}/g, '150.00')
            .replace(/{{date}}/g, new Date().toLocaleDateString())
            .replace(/{{to_email}}/g, 'john@example.com')
            .replace(/{{from_name}}/g, 'QuickXerox Admin');
        return html;
    };

    if (loading) return <div className="p-8 text-center">Loading templates...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar / Template Selector */}
                    <div className="bg-white rounded-lg shadow-sm p-4 h-fit">
                        <h3 className="text-lg font-semibold mb-4">Templates</h3>
                        <div className="space-y-2">
                            {TEMPLATE_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedTemplateId(opt.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedTemplateId === opt.id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    {opt.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">{TEMPLATE_OPTIONS.find(t => t.id === selectedTemplateId)?.name}</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                    >
                                        <Eye className="h-4 w-4" />
                                        {showPreview ? 'Edit' : 'Preview'}
                                    </button>
                                    <button
                                        onClick={resetToDefault}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {showPreview ? (
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[500px]">
                                    <div className="mb-4 pb-4 border-b border-gray-200">
                                        <p className="text-sm text-gray-500">Subject:</p>
                                        <p className="font-medium">{currentTemplate.subject}</p>
                                    </div>
                                    <iframe
                                        title="Preview"
                                        srcDoc={getPreviewHtml()}
                                        className="w-full h-[600px] bg-white rounded border border-gray-200"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                                        <input
                                            type="text"
                                            value={currentTemplate.subject}
                                            onChange={(e) => updateCurrentTemplate('subject', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            HTML Body
                                            <span className="text-xs text-gray-500 font-normal ml-2">(Variables: {'{{name}}'}, {'{{link}}'}, etc.)</span>
                                        </label>
                                        <textarea
                                            value={currentTemplate.body}
                                            onChange={(e) => updateCurrentTemplate('body', e.target.value)}
                                            className="w-full h-[500px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminEmailTemplates;
