import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface EmailTemplate {
    subject: string;
    body: string;
}

interface TemplatesMap {
    [key: string]: EmailTemplate;
}

const DEFAULT_TEMPLATES: TemplatesMap = {
    'SELLER_INVITE': {
        subject: 'Invitation to join QuickXerox as a Print Shop Partner',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
        <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 80px; width: auto;" />
    </div>
    <h2 style="color: #2563EB; font-size: 20px; margin-top: 0;">You're Invited!</h2>
    <p style="color: #374151; font-size: 16px;">Hi <strong>{{shop_name}}</strong>,</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">You've been invited to join QuickXerox as a print shop partner! We're building a platform to connect customers with local print shops, and we'd love to have you on board.</p>
    <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">Click the button below to register your shop and get started:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{invitation_link}}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Accept Invitation</a>
    </div>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
    <p style="color: #2563EB; font-size: 12px; word-break: break-all; margin-bottom: 30px;">{{invitation_link}}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">This invitation was sent by QuickXerox Admin. If you have any questions, please contact support at <a href="mailto:help-contact@quickxerox.app" style="color: #2563EB; text-decoration: none;">help-contact@quickxerox.app</a>.</p>
</div>`
    },
    'ORDER_INVOICE': {
        subject: 'Invoice for Order #{{order_id}} - QuickXerox',
        body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
        <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 80px; width: auto;" />
    </div>
    <h2 style="color: #2563EB; font-size: 20px; margin-top: 0;">Thank you for your order!</h2>
    <p style="color: #374151; font-size: 16px;">Hi {{name}},</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Your order <strong>#{{order_id}}</strong> has been successfully processed.</p>
    <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">You can download your invoice by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{pdf_url}}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Download Invoice</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">This is an automated message from QuickXerox. Please do not reply to this email.</p>
</div>`
    }
};

const TEMPLATE_OPTIONS = [
    { id: 'SELLER_INVITE', name: 'Seller Invitation' },
    { id: 'ORDER_INVOICE', name: 'Order Invoice' }
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
            .replace(/{{order_id}}/g, 'QX-987654')
            .replace(/{{pdf_url}}/g, '#')
            .replace(/{{invitation_link}}/g, 'https://quickxerox.app/seller-invitation?id=preview123');
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
                                        <p className="font-medium">{currentTemplate.subject.replace(/{{order_id}}/g, 'QX-987654')}</p>
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
