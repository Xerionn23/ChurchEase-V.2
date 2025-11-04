from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from supabase import create_client, Client
import os
from datetime import datetime, time, date
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import uuid
from decimal import Decimal
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import traceback

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)

# Supabase configuration
SUPABASE_URL = "https://dgeauftgwgxkbwidiios.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZWF1ZnRnd2d4a2J3aWRpaW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNzg0NDUsImV4cCI6MjA3Mjg1NDQ0NX0.RfXmA9vHiUkIR2blt6r2RP_2reKfdy8IQUL7b5uX13M"

# Initialize Supabase client with options to avoid proxy issues
try:
    from supabase.client import ClientOptions
    options = ClientOptions()
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options)
except Exception as e:
    # Fallback initialization
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Email configuration for Gmail SMTP
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'rotchercadorna16@gmail.com'
app.config['MAIL_PASSWORD'] = 'nkwbyvexcovwybdy'  # Gmail App Password (no spaces)
app.config['MAIL_DEFAULT_SENDER'] = ('ChurchEase', app.config['MAIL_USERNAME'])
mail = Mail(app)

# Helper functions for Supabase operations
def generate_reservation_id():
    """Generate unique reservation ID"""
    import random, string
    return 'R' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def create_user(username, email, password, role='secretary'):
    """Create a new user in Supabase"""
    try:
        # Determine full name based on username
        name_map = {
            'cyril.arbatin': 'Cyril Arbatin',
            'hana.umali': 'Hana Umali'
        }
        full_name = name_map.get(username, username)
        
        user_data = {
            'id': str(uuid.uuid4()),
            'username': username,
            'full_name': full_name,
            'email': email,
            'password_hash': generate_password_hash(password),
            'role': role,
            'created_at': datetime.utcnow().isoformat()
        }
        result = supabase.table('users').insert(user_data).execute()
        print(f"✅ Created user: {full_name} ({username})")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"❌ Error creating user {username}: {e}")
        return None

def get_user_by_username(username):
    """Get user by username from Supabase"""
    try:
        result = supabase.table('users').select('*').eq('username', username).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting user: {e}")
        return None

def get_all_priests():
    """Get all active priests from database"""
    try:
        result = supabase.table('priests').select('*').eq('status', 'active').execute()
        return result.data
    except Exception as e:
        print(f"Error getting priests: {e}")
        return []

def get_priest_by_id(priest_id):
    """Get priest by ID"""
    try:
        result = supabase.table('priests').select('*').eq('id', priest_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting priest: {e}")
        return None

def _get_serializer():
    secret = app.config.get('SECRET_KEY') or 'churchease-dev-secret'
    return URLSafeTimedSerializer(secret_key=secret)

def _generate_priest_action_link(reservation_uuid, priest_id, action):
    # Build absolute base URL
    from flask import request
    base = (request.host_url or '').rstrip('/')
    s = _get_serializer()
    token = s.dumps({'r': reservation_uuid, 'p': priest_id, 'a': action})
    return f"{base}/api/reservations/{reservation_uuid}/priest-response?action={action}&token={token}"

def render_decline_reason_form(reservation, reservation_uuid, token):
    """Render HTML form for priest to provide decline reason."""
    service_type = reservation.get('service_type', 'Unknown').title()
    reservation_date = reservation.get('reservation_date', 'N/A')
    reservation_time = reservation.get('reservation_time', 'N/A')
    
    # Format time
    if reservation_time and reservation_time != 'N/A':
        try:
            from datetime import datetime
            if isinstance(reservation_time, str) and ':' in reservation_time:
                time_obj = datetime.strptime(reservation_time.split('.')[0], '%H:%M:%S')
                reservation_time = time_obj.strftime('%I:%M %p')
        except:
            pass
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Decline Reservation - ChurchEase</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }}
            .container {{ max-width: 600px; width: 100%; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 32px; text-align: center; }}
            .header h1 {{ font-size: 28px; margin-bottom: 8px; }}
            .header p {{ opacity: 0.9; font-size: 16px; }}
            .content {{ padding: 40px; }}
            .reservation-info {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }}
            .reservation-info h3 {{ color: #1f2937; margin-bottom: 16px; font-size: 18px; }}
            .info-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
            .info-row:last-child {{ border-bottom: none; }}
            .info-label {{ font-weight: 600; color: #6b7280; width: 140px; }}
            .info-value {{ color: #1f2937; flex: 1; }}
            .form-group {{ margin-bottom: 24px; }}
            .form-group label {{ display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 15px; }}
            .form-group textarea {{ width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 120px; transition: border-color 0.3s; }}
            .form-group textarea:focus {{ outline: none; border-color: #ef4444; }}
            .required {{ color: #ef4444; }}
            .button-group {{ display: flex; gap: 12px; margin-top: 32px; }}
            .btn {{ flex: 1; padding: 14px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; }}
            .btn-decline {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; }}
            .btn-decline:hover {{ transform: translateY(-2px); box-shadow: 0 8px 16px rgba(239,68,68,0.3); }}
            .btn-cancel {{ background: #f3f4f6; color: #6b7280; }}
            .btn-cancel:hover {{ background: #e5e7eb; }}
            .help-text {{ color: #6b7280; font-size: 13px; margin-top: 8px; line-height: 1.5; }}
            .warning {{ background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
            .warning-icon {{ color: #f59e0b; font-size: 20px; margin-right: 8px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⛪ Decline Reservation</h1>
                <p>Please provide a reason for declining this reservation</p>
            </div>
            <div class="content">
                <div class="reservation-info">
                    <h3>📋 Reservation Details</h3>
                    <div class="info-row">
                        <div class="info-label">Service Type:</div>
                        <div class="info-value">{service_type}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Date:</div>
                        <div class="info-value">{reservation_date}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Time:</div>
                        <div class="info-value">{reservation_time}</div>
                    </div>
                </div>
                
                <div class="warning">
                    <span class="warning-icon">⚠️</span>
                    <strong>Important:</strong> The client will be notified of your decline and the reason you provide below.
                </div>
                
                <form method="POST" action="/api/reservations/{reservation_uuid}/priest-response?action=decline&token={token}">
                    <div class="form-group">
                        <label for="decline_reason">Reason for Declining <span class="required">*</span></label>
                        <textarea 
                            id="decline_reason" 
                            name="decline_reason" 
                            required 
                            placeholder="Please provide a clear reason for declining this reservation (e.g., 'Not available on this date', 'Prior commitment', 'Health reasons', etc.)"
                        ></textarea>
                        <div class="help-text">
                            Please be specific and professional. This reason will be shown to the client and secretary.
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn btn-cancel" onclick="window.history.back()">
                            ← Cancel
                        </button>
                        <button type="submit" class="btn btn-decline">
                            Decline Reservation →
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def test_email_configuration():
    """Test email configuration by sending a simple test email"""
    try:
        print("🔧 Testing email configuration...")
        print(f"📧 SMTP Server: {app.config['MAIL_SERVER']}")
        print(f"📧 SMTP Port: {app.config['MAIL_PORT']}")
        print(f"📧 Username: {app.config['MAIL_USERNAME']}")
        print(f"📧 TLS Enabled: {app.config['MAIL_USE_TLS']}")
        
        msg = Message(
            subject="ChurchEase Email Test",
            recipients=[app.config['MAIL_USERNAME']],  # Send to self for testing
            body="This is a test email to verify Gmail SMTP configuration is working.",
            html="<p>This is a test email to verify Gmail SMTP configuration is working.</p>"
        )
        
        print("📤 Attempting to send test email...")
        mail.send(msg)
        print("✅ Test email sent successfully!")
        return True
    except Exception as e:
        print(f"❌ Email test failed: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return False

def send_client_decline_notification(client_email, client_name, reservation_data):
    """Send email notification to client when priest declines their reservation."""
    try:
        subject = f"Reservation Update - {reservation_data['service_type'].title()} Service"
        
        # Enhanced HTML email body for client decline notification
        html = f"""
        <div style='font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;'>
            <!-- Header -->
            <div style='background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#ffffff;padding:24px;text-align:center;border-radius:8px 8px 0 0;'>
                <h1 style='margin:0;font-size:24px;font-weight:600;'>⛪ ChurchEase</h1>
                <p style='margin:8px 0 0 0;font-size:16px;opacity:0.9;'>Reservation Management System</p>
            </div>
            
            <!-- Content -->
            <div style='padding:32px 24px;'>
                <div style='background:#fef2f2;border-left:4px solid #ef4444;padding:16px;margin-bottom:24px;border-radius:0 6px 6px 0;'>
                    <h2 style='color:#991b1b;margin:0 0 8px 0;font-size:20px;'>📅 Reservation Update</h2>
                    <p style='color:#dc2626;margin:0;font-weight:500;'>Dear {client_name}, we need to inform you about your reservation.</p>
                </div>
                
                <!-- Reservation Details -->
                <div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;'>
                    <h3 style='color:#1e40af;margin:0 0 16px 0;font-size:18px;'>📋 Your Reservation Details</h3>
                    <table style='width:100%;border-collapse:collapse;'>
                        <tr><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;'><strong>Service Type:</strong></td><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;color:#059669;font-weight:600;'>{reservation_data.get('service_type','').title()}</td></tr>
                        <tr><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;'><strong>Date:</strong></td><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;'>{reservation_data.get('date','')}</td></tr>
                        <tr><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;'><strong>Time:</strong></td><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;'>{reservation_data.get('time','')}</td></tr>
                    </table>
                </div>
                
                <!-- Main Message -->
                <div style='background:#fff7ed;border:1px solid #f97316;border-radius:8px;padding:20px;margin:20px 0;'>
                    <h3 style='color:#c2410c;margin:0 0 12px 0;font-size:18px;'>🙏 Important Notice</h3>
                    <p style='color:#9a3412;margin:0 0 16px 0;font-size:16px;line-height:1.6;'>
                        <strong>We sincerely apologize, but our church priest is not available on your selected date.</strong>
                    </p>
                    <p style='color:#9a3412;margin:0 0 16px 0;font-size:16px;line-height:1.6;'>
                        To reschedule your reservation, please <strong>visit our church office</strong> to speak with our secretary and arrange a new date when our priest is available.
                    </p>
                    <p style='color:#9a3412;margin:0;font-size:16px;line-height:1.6;'>
                        If you prefer not to reschedule, you may <strong>visit our church office to collect your payment refund</strong>.
                    </p>
                </div>
                
                <!-- Church Contact Information -->
                <div style='background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:20px;margin:20px 0;'>
                    <h3 style='color:#065f46;margin:0 0 12px 0;font-size:18px;'>📍 Church Contact Information</h3>
                    <p style='color:#047857;margin:0 0 8px 0;'><strong>Church Address:</strong> [Your Church Address]</p>
                    <p style='color:#047857;margin:0 0 8px 0;'><strong>Office Hours:</strong> Tuesday to Sunday, 8:00 AM - 5:00 PM</p>
                    <p style='color:#047857;margin:0 0 8px 0;'><strong>Contact Number:</strong> [Your Church Phone]</p>
                    <p style='color:#047857;margin:0;'><strong>Note:</strong> Office is closed on Mondays</p>
                </div>
                
                <!-- Apology -->
                <div style='text-align:center;margin:24px 0;'>
                    <p style='color:#374151;font-size:16px;margin:0 0 8px 0;'>We sincerely apologize for any inconvenience this may cause.</p>
                    <p style='color:#6b7280;font-size:14px;margin:0;'>Thank you for your understanding and patience.</p>
                </div>
                
                <!-- Footer -->
                <div style='border-top:1px solid #e5e7eb;padding-top:20px;margin-top:32px;text-align:center;'>
                    <p style='color:#6b7280;font-size:14px;margin:0;'>God bless you and your family.</p>
                    <p style='color:#9ca3af;font-size:12px;margin:8px 0 0 0;'>— ChurchEase Reservation System</p>
                </div>
            </div>
        </div>
        """
        
        # Plain text fallback
        body = f"""
ChurchEase - Reservation Update
==============================

Dear {client_name},

We sincerely apologize, but our church priest is not available on your selected date.

Your Reservation Details:
------------------------
Service Type: {reservation_data.get('service_type','').title()}
Date: {reservation_data.get('date','')}
Time: {reservation_data.get('time','')}

NEXT STEPS:
----------
1. To reschedule: Please visit our church office to speak with our secretary and arrange a new date when our priest is available.

2. For refund: If you prefer not to reschedule, you may visit our church office to collect your payment refund.

Church Information:
------------------
Address: [Your Church Address]
Office Hours: Tuesday to Sunday, 8:00 AM - 5:00 PM
Contact: [Your Church Phone]
Note: Office is closed on Mondays

We sincerely apologize for any inconvenience this may cause.

God bless you and your family.

— ChurchEase Reservation System
        """

        # Create message with HTML and plain text using Flask-Mail
        msg = Message(
            subject=subject,
            recipients=[client_email],
            body=body,
            html=html
        )
        mail.send(msg)
        
        print(f"✅ Client decline notification sent to {client_email}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending client decline notification: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return False

def send_priest_notification_email(priest_email, priest_name, reservation_data, reservation_uuid, priest_id, secretary_info=None):
    """Send enhanced HTML email notification to priest about new reservation with approve/decline buttons."""
    try:
        subject = f"New Reservation Approval Request - {reservation_data['service_type'].title()}"

        approve_link = _generate_priest_action_link(reservation_uuid, priest_id, 'approve')
        decline_link = _generate_priest_action_link(reservation_uuid, priest_id, 'decline')

        # Get secretary information
        secretary_name = "Church Secretary"
        secretary_email = "secretary@churchease.com"
        if secretary_info:
            secretary_name = secretary_info.get('full_name', secretary_info.get('username', 'Church Secretary'))
            secretary_email = secretary_info.get('email', 'secretary@churchease.com')

        # Simple, clean email content matching event notification style
        details_html = ""
        
        # Simple, clean HTML email matching event notification style
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Reservation Assignment - ChurchEase</title>
        </head>
        <body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'>
            <div style='max-width:600px;margin:20px auto;background:#ffffff;'>
                
                <!-- Header -->
                <div style='background:#1e3a8a;color:#ffffff;padding:24px;text-align:center;'>
                    <h1 style='margin:0;font-size:24px;font-weight:normal;'>&#9962; ChurchEase</h1>
                    <p style='margin:4px 0 0 0;font-size:13px;'>Church Management System</p>
                </div>
                
                <!-- Content -->
                <div style='padding:24px;'>
                    
                    <!-- New Assignment Notice -->
                    <div style='background:#dbeafe;border-left:4px solid #3b82f6;padding:16px;margin-bottom:20px;'>
                        <h2 style='margin:0 0 8px 0;font-size:16px;color:#1e40af;'>&#10084; New Reservation Assignment</h2>
                        <p style='margin:0;font-size:14px;color:#1e3a8a;line-height:1.5;'>
                            A new church event has been added to your schedule and requires your attention.
                        </p>
                    </div>
                    
                    <!-- Reservation Information -->
                    <div style='background:#ffffff;border:1px solid #e5e7eb;padding:0;margin-bottom:20px;'>
                        <div style='background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;'>
                            <h3 style='margin:0;font-size:14px;color:#374151;font-weight:600;'>Reservation Information</h3>
                        </div>
                        <div style='padding:16px;'>
                            <table style='width:100%;border-collapse:collapse;'>
                                <tr>
                                    <td style='padding:8px 0;color:#6b7280;font-size:13px;width:140px;'>Event Name:</td>
                                    <td style='padding:8px 0;color:#111827;font-size:13px;font-weight:600;'>{reservation_data.get('service_type','').upper()}</td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 0;color:#6b7280;font-size:13px;'>Event Type:</td>
                                    <td style='padding:8px 0;'><span style='background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;'>{reservation_data.get('service_type','').lower()}</span></td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 0;color:#6b7280;font-size:13px;'>Date:</td>
                                    <td style='padding:8px 0;color:#111827;font-size:13px;'>{reservation_data.get('date','')}</td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 0;color:#6b7280;font-size:13px;'>Time:</td>
                                    <td style='padding:8px 0;color:#111827;font-size:13px;'>{reservation_data.get('time','')}</td>
                                </tr>
                                <tr>
                                    <td style='padding:8px 0;color:#6b7280;font-size:13px;'>Description:</td>
                                    <td style='padding:8px 0;color:#111827;font-size:13px;'>Client: {reservation_data.get('client_name','')} | Phone: {reservation_data.get('client_phone','')}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Action Required -->
                    <div style='background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin-bottom:20px;'>
                        <h3 style='margin:0 0 8px 0;font-size:14px;color:#92400e;font-weight:600;'>&#9888; Action Required</h3>
                        <p style='margin:0 0 16px 0;font-size:13px;color:#78350f;line-height:1.5;'>
                            This event has been added to the church calendar. Please review the details and respond accordingly. If you have any questions or concerns about this event, please contact the church secretary.
                        </p>
                        <div style='text-align:center;'>
                            <a href='{approve_link}' style='display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;margin:0 8px 8px 0;'>APPROVE RESERVATION</a>
                            <a href='{decline_link}' style='display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;margin:0 8px 8px 0;'>DECLINE RESERVATION</a>
                        </div>
                    </div>
                    
                    <!-- Church Contact -->
                    <div style='background:#ecfdf5;border-left:4px solid #10b981;padding:16px;margin-bottom:20px;'>
                        <h3 style='margin:0 0 8px 0;font-size:14px;color:#065f46;font-weight:600;'>&#128222; Church Contact</h3>
                        <p style='margin:0;font-size:13px;color:#047857;line-height:1.5;'>
                            <strong>Office Hours:</strong> Tuesday - Sunday, 8:00 AM - 5:00 PM<br>
                            <strong>Secretary:</strong> {secretary_name}<br>
                            <strong>Email:</strong> {secretary_email}<br>
                            <em style='font-size:12px;'>(We open 7 days a week)</em>
                        </p>
                    </div>
                    
                </div>
                
                <!-- Footer -->
                <div style='background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;'>
                    <p style='margin:0;font-size:12px;color:#6b7280;'>This email was sent by the ChurchEase System</p>
                    <p style='margin:4px 0 0 0;font-size:11px;color:#9ca3af;'><em>Powered by ChurchEase | Serving our community with faith and technology</em></p>
                </div>
                
            </div>
        </body>
        </html>
        """
        # Enhanced plain text fallback
        body = f"""
ChurchEase - New Reservation Assignment
=====================================

Dear Rev. {priest_name},

You have been assigned a new reservation requiring your approval.

RESERVATION DETAILS:
-------------------
Service Type: {reservation_data.get('service_type','').title()}
Date: {reservation_data.get('date','')}
Time: {reservation_data.get('time','')}
Client Name: {reservation_data.get('client_name','')}
Contact Phone: {reservation_data.get('client_phone','')}
Special Requests: {reservation_data.get('special_requests','None')}

ASSIGNED BY:
-----------
Secretary: {secretary_name}
Email: {secretary_email}

ACTION REQUIRED:
---------------
Please choose one of the options below:

APPROVE: {approve_link}
DECLINE: {decline_link}

If you have any questions, please contact the secretary directly.

Thank you for your service.
— ChurchEase Reservation System
        """
        # Create message with HTML and plain text
        msg = Message(
            subject=subject,
            recipients=[priest_email],
            body=body,
            html=html
        )
        mail.send(msg)
        print(f"✅ Email sent to {priest_name} ({priest_email})")
        return True
    except Exception as e:
        print(f"❌ Error sending email to {priest_email}: {e}")
        return False

def send_event_notification_email(priest_email, priest_name, event_data):
    """Send professional HTML email notification to priest about new event creation."""
    try:
        # Format event date and time
        event_date = datetime.strptime(event_data['event_date'], '%Y-%m-%d').strftime('%A, %B %d, %Y')
        start_time = datetime.strptime(event_data['start_time'], '%H:%M:%S').strftime('%I:%M %p')
        end_time = ''
        if event_data.get('end_time'):
            end_time = ' - ' + datetime.strptime(event_data['end_time'], '%H:%M:%S').strftime('%I:%M %p')
        
        # Event type display
        event_type_display = event_data['event_type'].replace('-', ' ').title()
        
        subject = f"New Church Event Created - {event_data['event_name']}"
        
        # HTML email template with professional ChurchEase design
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Event Notification</title>
        </head>
        <body style='margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f8fafc;'>
            <div style='max-width:600px;margin:0 auto;background:#ffffff;'>
                
                <!-- Header with ChurchEase Branding -->
                <div style='background:linear-gradient(135deg,#002b5c 0%,#0d1b2a 100%);padding:32px 24px;text-align:center;'>
                    <h1 style='color:#ffffff;margin:0;font-size:28px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.3);'>
                        ⛪ ChurchEase
                    </h1>
                    <p style='color:#d4af37;margin:8px 0 0 0;font-size:14px;font-weight:500;letter-spacing:1px;'>
                        Church Management System
                    </p>
                </div>
                
                <!-- Event Notification Header -->
                <div style='background:#e0f2fe;border-left:4px solid #0288d1;padding:20px 24px;'>
                    <h2 style='color:#01579b;margin:0;font-size:20px;font-weight:600;display:flex;align-items:center;'>
                        📅 New Event Created
                    </h2>
                    <p style='color:#0277bd;margin:8px 0 0 0;font-size:14px;'>
                        A new church event has been scheduled and requires your attention.
                    </p>
                </div>
                
                <!-- Event Details Card -->
                <div style='padding:24px;'>
                    <div style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;'>
                        <h3 style='color:#1e293b;margin:0 0 20px 0;font-size:18px;font-weight:600;border-bottom:2px solid #d4af37;padding-bottom:8px;'>
                            Event Information
                        </h3>
                        
                        <table style='width:100%;border-collapse:collapse;'>
                            <tr>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;width:30%;'>
                                    <strong style='color:#475569;font-size:14px;'>Event Name:</strong>
                                </td>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <span style='color:#1e293b;font-size:16px;font-weight:600;'>{event_data['event_name']}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <strong style='color:#475569;font-size:14px;'>Event Type:</strong>
                                </td>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <span style='background:#e0f2fe;color:#01579b;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;'>
                                        {event_type_display}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <strong style='color:#475569;font-size:14px;'>Date:</strong>
                                </td>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <span style='color:#1e293b;font-size:15px;font-weight:500;'>{event_date}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <strong style='color:#475569;font-size:14px;'>Time:</strong>
                                </td>
                                <td style='padding:12px 0;border-bottom:1px solid #e2e8f0;'>
                                    <span style='color:#1e293b;font-size:15px;font-weight:500;'>{start_time}{end_time}</span>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding:12px 0;'>
                                    <strong style='color:#475569;font-size:14px;'>Description:</strong>
                                </td>
                                <td style='padding:12px 0;'>
                                    <span style='color:#64748b;font-size:14px;line-height:1.6;'>
                                        {event_data.get('description', 'No description provided')}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Important Notice -->
                    <div style='background:#fff7ed;border:1px solid #f97316;border-radius:8px;padding:20px;margin:20px 0;'>
                        <h3 style='color:#c2410c;margin:0 0 12px 0;font-size:16px;'>📋 Action Required</h3>
                        <p style='color:#9a3412;margin:0;font-size:14px;line-height:1.6;'>
                            This event has been added to the church calendar. Please review the details and prepare accordingly. 
                            If you have any questions or concerns about this event, please contact the church secretary.
                        </p>
                    </div>
                    
                    <!-- Church Contact Information -->
                    <div style='background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:20px;margin:20px 0;'>
                        <h3 style='color:#15803d;margin:0 0 12px 0;font-size:16px;'>📞 Church Contact</h3>
                        <p style='color:#166534;margin:0 0 8px 0;font-size:14px;'>
                            <strong>Office Hours:</strong> Tuesday - Sunday, 8:00 AM - 5:00 PM
                        </p>
                        <p style='color:#166534;margin:0 0 8px 0;font-size:14px;'>
                            <strong>Phone:</strong> (02) 8123-4567
                        </p>
                        <p style='color:#166534;margin:0;font-size:14px;'>
                            <strong>Email:</strong> secretary@churchease.com
                        </p>
                        <p style='color:#dc2626;margin:8px 0 0 0;font-size:12px;font-style:italic;'>
                            Note: Office is closed on Mondays
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style='background:#f1f5f9;padding:24px;text-align:center;border-top:1px solid #e2e8f0;'>
                    <p style='color:#64748b;margin:0 0 8px 0;font-size:14px;'>
                        This notification was sent automatically by ChurchEase
                    </p>
                    <p style='color:#94a3b8;margin:0;font-size:12px;'>
                        Church Management System • Serving our community with faith and technology
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version for email clients that don't support HTML
        body = f"""
NEW CHURCH EVENT NOTIFICATION

Dear {priest_name},

A new church event has been created and added to the calendar:

EVENT DETAILS:
- Event Name: {event_data['event_name']}
- Event Type: {event_type_display}
- Date: {event_date}
- Time: {start_time}{end_time}
- Description: {event_data.get('description', 'No description provided')}

ACTION REQUIRED:
This event has been added to the church calendar. Please review the details and prepare accordingly.

If you have any questions or concerns about this event, please contact the church secretary.

CHURCH CONTACT:
Office Hours: Tuesday - Sunday, 8:00 AM - 5:00 PM
Phone: (02) 8123-4567
Email: secretary@churchease.com
Note: Office is closed on Mondays

Thank you for your service.
— ChurchEase Church Management System
        """
        
        # Create message with HTML and plain text
        msg = Message(
            subject=subject,
            recipients=[priest_email],
            body=body,
            html=html
        )
        mail.send(msg)
        print(f"✅ Event notification email sent to {priest_name} ({priest_email})")
        return True
    except Exception as e:
        print(f"❌ Error sending event notification email to {priest_email}: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return False

# Routes
@app.route('/')
def index():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Get user info for template
    user_info = {
        'username': session.get('username', 'secretary'),
        'full_name': session.get('full_name', 'Secretary'),
        'email': session.get('email', 'secretary@churchease.com'),
        'role': session.get('role', 'secretary')
    }
    
    # Route to appropriate dashboard based on role
    if session.get('role') == 'admin':
        return render_template('Admin-Dashboard.html', user=user_info)
    else:
        return render_template('Sec-Dashboard.html', user=user_info)

@app.route('/admin-dashboard')
def admin_dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Check if user has admin role
    if session.get('role') != 'admin':
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get user info for template
    user_info = {
        'username': session.get('username', 'admin'),
        'full_name': session.get('full_name', 'Administrator'),
        'email': session.get('email', 'admin@churchease.com'),
        'role': session.get('role', 'admin')
    }
    
    return render_template('Admin-Dashboard.html', user=user_info)

@app.route('/print-reports')
def print_reports():
    """Render print-friendly reports page"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Check if user has admin role
    if session.get('role') != 'admin':
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('dashboard'))
    
    return render_template('print-reports.html')

@app.route('/priest-dashboard')
def priest_dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Check if user has priest role
    if session.get('role') != 'priest':
        flash('Access denied. Priest privileges required.', 'error')
        return redirect(url_for('dashboard'))
    
    # Get user info for template
    user_info = {
        'username': session.get('username', ''),
        'full_name': session.get('full_name', 'Father'),
        'email': session.get('email', ''),
        'role': session.get('role', 'priest')
    }
    
    return render_template('Priest-Dashboard.html', user=user_info)

@app.route('/test-form')
def test_form():
    with open('test_form.html', 'r') as f:
        return f.read()

@app.route('/test-email')
def test_email():
    """Test email configuration endpoint"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    success = test_email_configuration()
    if success:
        return jsonify({'success': True, 'message': 'Test email sent successfully!'})
    else:
        return jsonify({'success': False, 'message': 'Email test failed. Check console for details.'})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Try database authentication first
        user = get_user_by_username(username)
        
        if user and check_password_hash(user['password_hash'], password):
            print(f"✅ Database authentication successful for user: {username}")
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            session['full_name'] = user.get('full_name', user['username'])
            session['email'] = user.get('email', f"{user['username']}@churchease.com")
            
            # Redirect based on role
            if user['role'] == 'admin':
                return jsonify({'success': True, 'redirect': '/admin-dashboard'})
            elif user['role'] == 'priest':
                return jsonify({'success': True, 'redirect': '/priest-dashboard'})
            else:
                return jsonify({'success': True, 'redirect': '/dashboard'})
        
        # Check if username matches a priest email
        try:
            priest_result = supabase.table('priests').select('*').eq('email', username).execute()
            if priest_result.data:
                priest = priest_result.data[0]
                # For priests, use email as username and a simple password (can be enhanced later)
                if password == 'priest123' or check_password_hash(priest.get('password_hash', ''), password):
                    # Construct full name from first_name and last_name
                    first_name = priest.get('first_name', '')
                    last_name = priest.get('last_name', '')
                    full_name = f"{first_name} {last_name}".strip() or 'Father'
                    
                    print(f"✅ Priest authentication successful: {full_name}")
                    session['user_id'] = priest['id']
                    session['username'] = priest['email']
                    session['role'] = 'priest'
                    session['full_name'] = full_name
                    session['email'] = priest['email']
                    session['priest_id'] = priest['id']
                    return jsonify({'success': True, 'redirect': '/priest-dashboard'})
        except Exception as e:
            print(f"Error checking priest authentication: {e}")
        
        # Admin credentials fallback (only if not in database)
        if username == 'admin' and password == 'admin123':
            existing_admin = get_user_by_username(username)
            if not existing_admin:
                print("Creating admin user in database...")
                create_user(username, 'admin@churchease.com', password, 'admin')
                print("✅ Admin user created successfully")
            
            session['user_id'] = 'admin-001'
            session['username'] = username
            session['role'] = 'admin'
            session['full_name'] = 'Administrator'
            session['email'] = 'admin@churchease.com'
            return jsonify({'success': True, 'redirect': '/admin-dashboard'})
        
        print(f"❌ Authentication failed for user: {username}")
        if user:
            print(f"   User found in database but password doesn't match")
        else:
            print(f"   User not found in database")
        return jsonify({'success': False, 'message': 'Invalid credentials'})
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# API Endpoints for Reservations

# New date-based reservation endpoints
@app.route('/api/reservations/by-date/<date>', methods=['GET'])
def get_reservations_by_date(date):
    """Get all reservations for a specific date"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Define service tables
        service_tables = {
            'wedding': 'wedding_reservations',
            'baptism': 'baptism_reservations', 
            'funeral': 'funeral_reservations',
            'confirmation': 'confirmation_reservations'
        }
        
        date_reservations = []
        
        # Fetch from each service table for the specific date
        for service_type, table_name in service_tables.items():
            try:
                result = supabase.table(table_name).select('*').eq('reservation_date', date).order('start_time').execute()
                
                # Format each reservation
                for reservation in result.data:
                    formatted_reservation = {
                        'id': reservation['id'],
                        'service_type': service_type,
                        'date': reservation['reservation_date'],
                        'start_time': reservation['start_time'],
                        'end_time': reservation.get('end_time'),
                        'status': reservation['status'],
                        'contact_name': f"{reservation['contact_first_name']} {reservation['contact_last_name']}",
                        'contact_phone': reservation['contact_phone'],
                        'contact_email': reservation.get('contact_email', ''),
                        'payment_method': reservation.get('payment_method'),
                        'amount_paid': reservation.get('amount_paid'),
                        'total_amount': reservation.get('total_amount'),
                        'special_requests': reservation.get('special_requests', ''),
                        'created_at': reservation['created_at']
                    }
                    date_reservations.append(formatted_reservation)
                    
            except Exception as e:
                print(f"Error fetching {service_type} reservations for date {date}: {e}")
                continue
        
        # Sort by start time
        date_reservations.sort(key=lambda x: x['start_time'])
        
        return jsonify({
            'success': True,
            'date': date,
            'reservations': date_reservations,
            'total': len(date_reservations)
        })
        
    except Exception as e:
        print(f"Error getting reservations by date: {e}")
        return jsonify({'error': 'Failed to fetch reservations for date'}), 500

@app.route('/api/reservations/available-slots/<date>', methods=['GET'])
def get_available_time_slots(date):
    """Get available time slots for a specific date"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Define standard time slots (you can customize these)
        standard_slots = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
        ]
        
        # Get existing reservations for the date
        response = get_reservations_by_date(date)
        if response.status_code != 200:
            return response
            
        existing_reservations = response.get_json()['reservations']
        
        # Extract occupied time slots
        occupied_slots = []
        for reservation in existing_reservations:
            start_time = reservation['start_time'][:5]  # Get HH:MM format
            occupied_slots.append(start_time)
        
        # Calculate available slots
        available_slots = [slot for slot in standard_slots if slot not in occupied_slots]
        
        return jsonify({
            'success': True,
            'date': date,
            'available_slots': available_slots,
            'occupied_slots': occupied_slots,
            'total_available': len(available_slots)
        })
        
    except Exception as e:
        print(f"Error getting available slots: {e}")
        return jsonify({'error': 'Failed to fetch available time slots'}), 500

@app.route('/api/reservations/calendar-data', methods=['GET'])
def get_calendar_data():
    """Get reservation data for calendar display"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get date range from query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start date and end date are required'}), 400
        
        # Define service tables
        service_tables = {
            'wedding': 'wedding_reservations',
            'baptism': 'baptism_reservations', 
            'funeral': 'funeral_reservations',
            'confirmation': 'confirmation_reservations'
        }
        
        calendar_data = {}
        
        # Fetch from each service table within date range
        for service_type, table_name in service_tables.items():
            try:
                result = supabase.table(table_name).select('reservation_date, start_time, status').gte('reservation_date', start_date).lte('reservation_date', end_date).execute()
                
                for reservation in result.data:
                    date = reservation['reservation_date']
                    if date not in calendar_data:
                        calendar_data[date] = []
                    
                    calendar_data[date].append({
                        'service_type': service_type,
                        'time': reservation['start_time'],
                        'status': reservation['status']
                    })
                    
            except Exception as e:
                print(f"Error fetching calendar data for {service_type}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'calendar_data': calendar_data,
            'date_range': {
                'start': start_date,
                'end': end_date
            }
        })
        
    except Exception as e:
        print(f"Error getting calendar data: {e}")
        return jsonify({'error': 'Failed to fetch calendar data'}), 500

@app.route('/api/reservations/all', methods=['GET'])
def get_all_reservations():
    # Temporarily remove auth check for testing
    # if 'user_id' not in session:
    #     return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get query parameters
        service_filter = request.args.get('service_type', 'all')
        status_filter = request.args.get('status', 'all')
        date_filter = request.args.get('date')
        
        all_reservations = []
        
        # OPTIMIZATION: Fetch all related data in bulk to reduce queries
        try:
            print(f"🚀 OPTIMIZED: Querying main reservations table...")
            main_query = supabase.table('reservations').select('*')
            
            # Apply filters
            if service_filter != 'all':
                main_query = main_query.eq('service_type', service_filter)
            
            if status_filter != 'all':
                main_query = main_query.eq('status', status_filter)
            
            if date_filter:
                main_query = main_query.eq('reservation_date', date_filter)
            
            main_result = main_query.order('created_at', desc=True).execute()
            print(f"✅ Query result: {len(main_result.data)} reservations")
            
            # OPTIMIZATION: Fetch all clients, priests, payments, and users in bulk
            client_ids = [r.get('client_id') for r in main_result.data if r.get('client_id')]
            priest_ids = [r.get('priest_id') for r in main_result.data if r.get('priest_id')]
            reservation_ids = [r.get('id') for r in main_result.data if r.get('id')]
            created_by_ids = [r.get('created_by') for r in main_result.data if r.get('created_by')]
            
            # Bulk fetch clients
            clients_map = {}
            if client_ids:
                clients_result = supabase.table('clients').select('*').in_('id', client_ids).execute()
                clients_map = {c['id']: c for c in clients_result.data}
                print(f"✅ Fetched {len(clients_map)} clients in 1 query")
            
            # Bulk fetch priests
            priests_map = {}
            if priest_ids:
                priests_result = supabase.table('priests').select('*').in_('id', priest_ids).execute()
                priests_map = {p['id']: p for p in priests_result.data}
                print(f"✅ Fetched {len(priests_map)} priests in 1 query")
            
            # Bulk fetch payments
            payments_map = {}
            if reservation_ids:
                payments_result = supabase.table('payments').select('*').in_('reservation_id', reservation_ids).execute()
                payments_map = {p['reservation_id']: p for p in payments_result.data}
                print(f"✅ Fetched {len(payments_map)} payments in 1 query")
            
            # Bulk fetch users (secretaries who created reservations)
            users_map = {}
            if created_by_ids:
                users_result = supabase.table('users').select('*').in_('id', created_by_ids).execute()
                users_map = {u['id']: u for u in users_result.data}
                print(f"✅ Fetched {len(users_map)} users in 1 query")
            
            # OPTIMIZATION: Process reservations using cached data (no more queries in loop)
            for reservation in main_result.data:
                # Get client information from cache
                client_name = 'Unknown Client'
                client_phone = ''
                client_email = ''
                
                client_id = reservation.get('client_id')
                if client_id and client_id in clients_map:
                    client = clients_map[client_id]
                    client_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
                    client_phone = client.get('phone', '')
                    client_email = client.get('email', '')
                
                # Fallback to contact fields if no client found
                if client_name == 'Unknown Client' or client_name.strip() == '':
                    first_name = reservation.get('contact_first_name', '')
                    last_name = reservation.get('contact_last_name', '')
                    client_name = f"{first_name} {last_name}".strip() or 'Unknown Client'
                    client_phone = reservation.get('contact_phone', client_phone)
                    client_email = reservation.get('contact_email', client_email)
                
                # Get priest information from cache
                priest_name = 'Not Assigned'
                priest_id = reservation.get('priest_id')
                if priest_id and priest_id in priests_map:
                    priest = priests_map[priest_id]
                    priest_name = f"{priest.get('first_name', '')} {priest.get('last_name', '')}".strip()
                
                # Get secretary/user information - PRIORITIZE actual column value
                # First check if created_by_secretary column has a value (from database)
                created_by_name = reservation.get('created_by_secretary')
                
                # If no value in column, fallback to users table lookup
                if not created_by_name:
                    created_by_name = 'System'
                    created_by_id = reservation.get('created_by')
                    if created_by_id and created_by_id in users_map:
                        user = users_map[created_by_id]
                        # Get full name first, fallback to username, then System
                        if user.get('full_name'):
                            created_by_name = user.get('full_name')
                        elif user.get('username'):
                            # Capitalize username for better display (admin -> Admin)
                            created_by_name = user.get('username').title()
                        else:
                            created_by_name = 'System'
                
                # Get payment information from cache
                payment_status = None
                amount_paid = None
                total_amount = None
                payment_method = None
                payment_type = None
                gcash_reference = None
                
                res_id = reservation.get('id')
                if res_id and res_id in payments_map:
                    payment = payments_map[res_id]
                    payment_status = payment.get('payment_status')
                    amount_paid = payment.get('amount_paid')
                    total_amount = payment.get('amount_due')
                    payment_method = payment.get('payment_method')
                    payment_type = payment.get('payment_type')
                    gcash_reference = payment.get('gcash_reference')

                # Build formatted reservation object
                formatted_reservation = {
                    'id': reservation.get('id') or reservation.get('reservation_id'),
                    'reservation_id': reservation.get('reservation_id'),
                    'service_type': reservation.get('service_type', 'unknown'),
                    'date': reservation.get('reservation_date'),
                    'time_slot': reservation.get('reservation_time'),
                    'time': reservation.get('reservation_time'),
                    'end_time': reservation.get('end_time'),
                    'status': reservation.get('status', 'pending'),
                    'contact_name': client_name,
                    'contact_phone': client_phone,
                    'contact_email': client_email,
                    'location': reservation.get('location', 'Main Church'),
                    'attendees': reservation.get('attendees', 1),
                    'special_requests': reservation.get('special_requests', ''),
                    'priest_name': priest_name,
                    'priest_id': reservation.get('priest_id'),
                    'created_at': reservation.get('created_at'),
                    'updated_at': reservation.get('updated_at'),
                    'created_by_secretary': created_by_name,  # Secretary who created the reservation
                    # Payment/Stipendium information
                    'payment_status': payment_status,
                    'amount_paid': amount_paid,
                    'total_amount': total_amount,
                    'payment_method': payment_method,
                    'payment_type': payment_type,
                    'gcash_reference': gcash_reference,
                    # ATTENDANCE TRACKING FIELDS
                    'attendance_status': reservation.get('attendance_status'),
                    'attendance_marked_at': reservation.get('attendance_marked_at'),
                    'attendance_marked_by': reservation.get('attendance_marked_by'),
                    # FUNERAL MULTI-DAY FIELDS
                    'funeral_start_date': reservation.get('funeral_start_date'),
                    'funeral_end_date': reservation.get('funeral_end_date'),
                    'funeral_start_time': reservation.get('funeral_start_time'),
                    'funeral_end_time': reservation.get('funeral_end_time')
                }
                all_reservations.append(formatted_reservation)
            
            print(f"🎉 OPTIMIZED: Processed {len(all_reservations)} reservations with only 5 queries (clients, priests, payments, users, reservations)")
            
        except Exception as e:
            print(f"Error querying main reservations table: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
        
        # Sort all reservations by creation date in ascending order (oldest first)
        all_reservations.sort(key=lambda x: x['created_at'], reverse=False)
        
        # Assign sequential display IDs starting from 1
        for index, reservation in enumerate(all_reservations, 1):
            reservation['display_id'] = index
        
        return jsonify({
            'success': True,
            'data': all_reservations,
            'total': len(all_reservations)
        })
        
    except Exception as e:
        print(f"Error getting all reservations: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Failed to fetch reservations',
            'success': False,
            'details': str(e)
        }), 500

# General reservation endpoint
@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    # Temporarily remove auth check for testing
    # if 'user_id' not in session:
    #     return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        service_type = data.get('service_type') or data.get('selectedService')
        payment_data = data.get('payment')
        
        # Validate service type
        valid_services = ['wedding', 'baptism', 'funeral', 'confirmation']
        if service_type not in valid_services:
            return jsonify({'error': 'Invalid service type', 'success': False}), 400
        
        # Debug: Print received data
        print(f"Received data for {service_type}: {data}")
        
        # Parse time_slot to get start_time and end_time
        time_slot = data.get('time_slot') or data.get('reservationTime')
        print(f"DEBUG: Received time_slot: '{time_slot}'")
        
        if time_slot:
            # Convert 12-hour format (e.g., "1:00 PM") to 24-hour format
            try:
                if 'AM' in time_slot or 'PM' in time_slot:
                    # Parse 12-hour format
                    time_part = time_slot.replace(' AM', '').replace(' PM', '')
                    hour, minute = time_part.split(':')
                    hour = int(hour)
                    minute = int(minute)
                    
                    # Convert to 24-hour format
                    if 'PM' in time_slot and hour != 12:
                        hour += 12
                    elif 'AM' in time_slot and hour == 12:
                        hour = 0
                    
                    start_time = f"{hour:02d}:{minute:02d}:00"  # Add seconds for database
                    print(f"DEBUG: Converted '{time_slot}' to 24-hour: '{start_time}'")
                else:
                    # Already in 24-hour format
                    start_time = time_slot if ':' in time_slot else f"{time_slot}:00:00"
                    if start_time.count(':') == 1:
                        start_time += ":00"  # Add seconds if missing
                    print(f"DEBUG: Using 24-hour format: '{start_time}'")
            except Exception as e:
                print(f"ERROR parsing time_slot '{time_slot}': {e}")
                start_time = "09:00:00"  # Default fallback
        else:
            start_time = ''
            end_time = ''
        
        # Generate unique reservation ID
        reservation_id = generate_reservation_id()
        
        # Prepare common data with safe access - only include fields that exist in database
        common_data = {
            'id': reservation_id,
            'status': data.get('status', 'pending'),
            'contact_first_name': data.get('contact_first_name') or data.get('contactFirstName', ''),
            'contact_last_name': data.get('contact_last_name') or data.get('contactLastName', ''),
            'contact_phone': data.get('contact_phone') or data.get('contactPhone', ''),
            'contact_email': data.get('contact_email') or data.get('contactEmail', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Create a dummy client first (since client_id is required)
        client_data = {
            'first_name': data.get('contact_first_name') or data.get('contactFirstName', 'Unknown'),
            'last_name': data.get('contact_last_name') or data.get('contactLastName', 'Client'),
            'phone': data.get('contact_phone') or data.get('contactPhone', ''),
            'email': data.get('contact_email') or data.get('contactEmail', ''),
            'address': ''
        }
        
        # Insert client first
        client_result = supabase.table('clients').insert(client_data).execute()
        if not client_result.data:
            raise Exception("Failed to create client record")
        
        client_id = client_result.data[0]['id']
        
        # Create user ID (use first available user or create a default one)
        users_result = supabase.table('users').select('id').limit(1).execute()
        if users_result.data:
            created_by = users_result.data[0]['id']
        else:
            # Create a default system user
            system_user = {
                'username': 'system',
                'email': 'system@churchease.com',
                'password_hash': 'system_hash',
                'role': 'secretary'
            }
            user_result = supabase.table('users').insert(system_user).execute()
            created_by = user_result.data[0]['id']
        
        # Get current secretary information from session
        secretary_info = {
            'full_name': session.get('full_name', 'Church Secretary'),
            'username': session.get('username', 'secretary'),
            'email': session.get('email', 'secretary@churchease.com'),
            'user_id': session.get('user_id')
        }
        print(f"Secretary info: {secretary_info}")
        
        # Get selected priest from form data (check both field names for compatibility)
        selected_priest_id = data.get('assigned_priest') or data.get('assignedPriest')
        assigned_priest = None
        if selected_priest_id:
            assigned_priest = get_priest_by_id(selected_priest_id)
            print(f"Selected priest ID: {selected_priest_id}")
            print(f"Selected priest: {assigned_priest}")
        else:
            print("No priest selected in form")
            print(f"Available form data keys: {list(data.keys())}")
        
        # Collect service-specific details based on service type
        service_details = {}
        
        if service_type == 'wedding':
            service_details = {
                'bride_name': data.get('bride_name', '') or data.get('brideName', ''),
                'groom_name': data.get('groom_name', '') or data.get('groomName', ''),
                'number_of_guests': data.get('number_of_guests', '') or data.get('numberOfGuests', ''),
                'wedding_theme': data.get('wedding_theme', '') or data.get('weddingTheme', ''),
                'bride_address': data.get('bride_address', '') or data.get('brideAddress', ''),
                'groom_address': data.get('groom_address', '') or data.get('groomAddress', '')
            }
        elif service_type == 'baptism':
            service_details = {
                'child_name': data.get('child_full_name', ''),
                'child_gender': data.get('child_gender', ''),
                'baptism_type': data.get('baptism_type', ''),
                'parents': f"{data.get('father_name', '')} & {data.get('mother_name', '')}".strip(' & '),
                'father_name': data.get('father_name', ''),
                'mother_name': data.get('mother_name', ''),
                'birth_date': data.get('child_date_of_birth', '')
            }
        elif service_type == 'funeral':
            # Use reservation date/time as funeral start
            funeral_start_date = data.get('date') or data.get('reservationDate', '')
            funeral_start_time = start_time  # Already converted to 24-hour format above
            funeral_end_date = data.get('funeral_end_date', '')
            funeral_end_time = data.get('funeral_end_time', '')
            
            print(f"🕯️ FUNERAL DATA RECEIVED:")
            print(f"  data.get('date'): {data.get('date')}")
            print(f"  data.get('reservationDate'): {data.get('reservationDate')}")
            print(f"  data.get('funeral_end_date'): {data.get('funeral_end_date')}")
            print(f"  data.get('funeral_end_time'): {data.get('funeral_end_time')}")
            print(f"  start_time (converted): {start_time}")
            print(f"🕯️ FUNERAL DATA TO SAVE:")
            print(f"  Start Date: {funeral_start_date}")
            print(f"  Start Time: {funeral_start_time}")
            print(f"  End Date: {funeral_end_date}")
            print(f"  End Time: {funeral_end_time}")
            
            service_details = {
                'deceased_name': data.get('deceased_name', ''),
                'deceased_age': data.get('deceased_age', ''),
                'relationship': data.get('relationship', ''),
                'burial_location': data.get('burial_location', ''),
                'wake_location': data.get('wake_location', ''),
                'date_of_death': data.get('date_of_death', ''),
                'funeral_home_contact': data.get('funeral_home_contact', ''),
                # 3-day funeral schedule - start is from reservation date/time
                'funeral_start_date': funeral_start_date,
                'funeral_start_time': funeral_start_time,
                'funeral_end_date': funeral_end_date,
                'funeral_end_time': funeral_end_time
            }
        elif service_type == 'confirmation':
            service_details = {
                'confirmand_name': data.get('candidate_name', ''),
                'confirmation_name': data.get('confirmation_name', ''),
                'sponsor_name': data.get('sponsor_name', ''),
                'attendees': data.get('number_of_attendees', ''),
                'preparation_status': data.get('preparation_status', '')
            }
        
        print(f"DEBUG: Service-specific details for {service_type}: {service_details}")

        # Combine special requests with service details (temporary solution until database is updated)
        special_requests_text = data.get('special_requests', '')
        if service_details:
            # Store service details as JSON in special_requests field temporarily
            import json
            service_details_json = json.dumps(service_details)
            if special_requests_text:
                combined_requests = f"{special_requests_text}\n\n[SERVICE_DETAILS]{service_details_json}[/SERVICE_DETAILS]"
            else:
                combined_requests = f"[SERVICE_DETAILS]{service_details_json}[/SERVICE_DETAILS]"
        else:
            combined_requests = special_requests_text

        # Get current secretary information from session
        secretary_info = {
            'full_name': session.get('full_name', 'Church Secretary'),
            'username': session.get('username', 'secretary'),
            'email': session.get('email', 'secretary@churchease.com'),
            'user_id': session.get('user_id')
        }
        print(f"Secretary info: {secretary_info}")
        
        # Map assigned_priest/assignedPriest to priest_id and insert only valid fields
        selected_priest_id = data.get('assigned_priest') or data.get('assignedPriest')
        assigned_priest = None
        if selected_priest_id:
            assigned_priest = get_priest_by_id(selected_priest_id)

        reservation_data = {
            'reservation_id': reservation_id,
            'service_type': service_type,
            'reservation_date': data.get('date') or data.get('reservationDate', ''),
            'reservation_time': start_time,  # Now properly formatted as HH:MM:SS
            'location': 'Main Church',
            'attendees': int(data.get('number_of_guests', 1)) if data.get('number_of_guests') else 1,
            'special_requests': combined_requests,  # Include service details in special_requests temporarily
            'status': 'waiting_priest_approval' if assigned_priest else 'pending',
            'priest_id': assigned_priest['id'] if assigned_priest else None,
            'client_id': client_id,
            'created_by': created_by,
            'created_by_secretary': secretary_info['full_name'],
            'created_by_email': secretary_info['email']
        }
        
        # Add funeral-specific fields if this is a funeral service
        if service_type == 'funeral' and service_details:
            funeral_start = service_details.get('funeral_start_date')
            funeral_end = service_details.get('funeral_end_date')
            funeral_start_time = service_details.get('funeral_start_time')
            funeral_end_time = service_details.get('funeral_end_time')
            
            # Only add funeral fields if they have valid values (not empty strings)
            if funeral_start:
                reservation_data['funeral_start_date'] = funeral_start
            if funeral_end:
                reservation_data['funeral_end_date'] = funeral_end
            if funeral_start_time:
                reservation_data['funeral_start_time'] = funeral_start_time
            if funeral_end_time:
                reservation_data['funeral_end_time'] = funeral_end_time
                
            print(f"✅ Added funeral fields to reservation_data:")
            print(f"   funeral_start_date: {reservation_data.get('funeral_start_date', 'NOT SET')}")
            print(f"   funeral_end_date: {reservation_data.get('funeral_end_date', 'NOT SET')}")
            print(f"   funeral_start_time: {reservation_data.get('funeral_start_time', 'NOT SET')}")
            print(f"   funeral_end_time: {reservation_data.get('funeral_end_time', 'NOT SET')}")
        
        # Remove any stray assigned_priest/assignedPriest fields if present
        reservation_data.pop('assigned_priest', None)
        reservation_data.pop('assignedPriest', None)

        
        print(f"DEBUG: Final reservation_data with time: {reservation_data}")
        # Print length of each field for troubleshooting
        for k, v in reservation_data.items():
            print(f"[DEBUG] {k}: {v} (len={len(str(v)) if v else 0})")
        
        # Debug: Print the final reservation data before insertion
        print(f"Final reservation data for {service_type}: {reservation_data}")
        
        # Insert into the general reservations table
        table_name = "reservations"
        print(f"Inserting into table: {table_name}")
        
        try:
            result = supabase.table(table_name).insert(reservation_data).execute()
            print(f"Insert result: {result}")
            print(f"Insert result data: {result.data}")
            print(f"Insert result count: {result.count}")
        except Exception as insert_error:
            print(f"Insert error: {str(insert_error)}")
            print(f"Insert error type: {type(insert_error)}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            raise insert_error
        
        if result.data:
            print(f"SUCCESS: Reservation inserted successfully with ID: {reservation_id}")
            print(f"Inserted data: {result.data[0]}")
            reservation_row_uuid = result.data[0].get('id')  # Supabase-generated UUID
            
            # Send email notification to priest if assigned
            if assigned_priest:
                email_data = {
                    'service_type': service_type,
                    'date': data.get('date') or data.get('reservationDate', ''),
                    'time': start_time,
                    'client_name': f"{client_data['first_name']} {client_data['last_name']}".strip(),
                    'client_phone': client_data['phone'],
                    'special_requests': data.get('special_requests', '')
                }
                
                priest_name = f"{assigned_priest['first_name']} {assigned_priest['last_name']}"
                email_sent = send_priest_notification_email(
                    assigned_priest['email'],
                    priest_name,
                    email_data,
                    reservation_row_uuid,
                    assigned_priest['id'],
                    secretary_info
                )
                print(f"Email notification sent to {priest_name}: {email_sent}")
            
            # Handle payment data if provided
            if payment_data:
                try:
                    payment_record = {
                        'id': str(uuid.uuid4()),
                        # Store the reservations row UUID for compatibility with UUID-typed FK columns
                        'reservation_id': reservation_row_uuid or reservation_id,
                        'service_type': service_type,
                        'payment_method': payment_data.get('payment_method', ''),
                        'payment_type': payment_data.get('payment_type', ''),
                        'base_price': float(payment_data.get('base_price', 0)),
                        'discount_type': payment_data.get('discount_type', 'none'),
                        'discount_value': float(payment_data.get('discount_value', 0)),
                        'discount_amount': float(payment_data.get('discount_amount', 0)),
                        'amount_due': float(payment_data.get('amount_due', 0)),
                        'amount_paid': float(payment_data.get('amount_paid', 0)),
                        'balance': float(payment_data.get('balance', 0)),
                        'payment_status': payment_data.get('payment_status', 'pending'),
                        'gcash_reference': payment_data.get('gcash_reference'),
                        'payment_notes': '',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    # Insert payment record
                    payment_result = supabase.table('payments').insert(payment_record).execute()
                    print(f"Payment record created: {payment_result.data}")
                except Exception as payment_err:
                    print(f"WARNING: Failed to insert payment record (will not block reservation). Error: {payment_err}")
            
            return jsonify({
                'success': True,
                'message': f'{service_type.title()} reservation created successfully',
                'data': result.data[0],
                'reservation_id': reservation_id
            })
        else:
            print(f"ERROR: No data returned from insert operation")
            print(f"Result object: {result}")
            return jsonify({
                'success': False,
                'error': 'Failed to create reservation - no data returned from database'
            }), 500
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error creating reservation: {str(e)}")
        print(f"Full error traceback: {error_details}")
        return jsonify({
            'success': False,
            'message': f'Failed to create reservation: {str(e)}',
            'error_details': error_details
        }), 500

# Service-specific reservation endpoints
@app.route('/api/reservations/<service_type>', methods=['POST'])
def create_service_reservation(service_type):
    # Temporarily remove auth check for testing
    # if 'user_id' not in session:
    #     return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        payment_data = data.get('payment')
        
        # Validate service type
        valid_services = ['wedding', 'baptism', 'funeral', 'confirmation']
        if service_type not in valid_services:
            return jsonify({'error': 'Invalid service type'}), 400
        
        # Debug: Print received data
        print(f"Received data for {service_type}: {data}")
        
        # Parse time_slot to get start_time and end_time
        time_slot = data.get('time_slot', '')
        if time_slot:
            # Convert time_slot (e.g., "20:00") to proper time format
            start_time = time_slot
            # Assume 1-hour duration for all services
            try:
                hour = int(time_slot.split(':')[0])
                end_hour = hour + 1
                end_time = f"{end_hour:02d}:00"
            except:
                end_time = time_slot
        else:
            start_time = ''
            end_time = ''
        
        # Generate unique reservation ID
        reservation_id = generate_reservation_id()
        
        # Prepare common data with safe access
        common_data = {
            'id': reservation_id,
            'reservation_date': data.get('date', ''),
            'start_time': start_time,
            'end_time': end_time,
            'status': data.get('status', 'pending'),
            'contact_first_name': data.get('contact_first_name', ''),
            'contact_last_name': data.get('contact_last_name', ''),
            'contact_phone': data.get('contact_phone', ''),
            'contact_email': data.get('contact_email', ''),
            'payment_method': data.get('payment_method', ''),
            'payment_reference': data.get('payment_reference', ''),
            'amount_paid': data.get('amount_paid', 0),
            'special_requests': data.get('special_requests', ''),
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Add service-specific data
        if service_type == 'wedding':
            service_data = {
                **common_data,
                'bride_name': data.get('bride_name', ''),
                'groom_name': data.get('groom_name', ''),
                'number_of_guests': data.get('number_of_guests', 0),
                'wedding_theme': data.get('wedding_theme', ''),
                'total_amount': 5000.00
            }
            table_name = 'wedding_reservations'
            
        elif service_type == 'baptism':
            service_data = {
                **common_data,
                'child_full_name': data.get('child_full_name', ''),
                'child_date_of_birth': data.get('child_date_of_birth', ''),
                'child_place_of_birth': data.get('child_place_of_birth', ''),
                'child_gender': data.get('child_gender', ''),
                'father_name': data.get('father_name', ''),
                'father_religion': data.get('father_religion', ''),
                'mother_maiden_name': data.get('mother_maiden_name', ''),
                'mother_religion': data.get('mother_religion', ''),
                'parents_address': data.get('parents_address', ''),
                'parents_contact': data.get('parents_contact', ''),
                'godparents_list': data.get('godparents_list', ''),
                'baptism_type': data.get('baptism_type', ''),
                'total_amount': 1500.00
            }
            table_name = 'baptism_reservations'
            
        elif service_type == 'funeral':
            service_data = {
                **common_data,
                'deceased_full_name': data.get('deceased_full_name', ''),
                'deceased_age': data.get('deceased_age', 0),
                'date_of_death': data.get('date_of_death', ''),
                'family_address': data.get('family_address', ''),
                'wake_location': data.get('wake_location', ''),
                'burial_location': data.get('burial_location', ''),
                'relationship_to_deceased': data.get('relationship_to_deceased', ''),
                'total_amount': 3000.00
            }
            table_name = 'funeral_reservations'
            
        elif service_type == 'confirmation':
            service_data = {
                **common_data,
                'confirmand_name': data.get('confirmand_name', ''),
                'confirmation_name': data.get('confirmation_name', ''),
                'sponsor_name': data.get('sponsor_name', ''),
                'number_of_attendees': data.get('number_of_attendees', 0),
                'total_amount': 1000.00
            }
            table_name = 'confirmation_reservations'
        
        # Insert into appropriate table
        result = supabase.table(table_name).insert(service_data).execute()
        
        if result.data:
            reservation_created = result.data[0]
            
            # Create payment record if payment data is provided
            if payment_data:
                try:
                    payment_record = {
                        'id': str(uuid.uuid4()),
                        'reservation_id': reservation_id,
                        'service_type': service_type,
                        'payment_method': payment_data.get('payment_method'),
                        'payment_type': payment_data.get('payment_type'),
                        'base_price': float(payment_data.get('base_price', 0)),
                        'discount_type': payment_data.get('discount_type', 'none'),
                        'discount_value': float(payment_data.get('discount_value', 0)),
                        'discount_amount': float(payment_data.get('discount_amount', 0)),
                        'amount_due': float(payment_data.get('amount_due', 0)),
                        'amount_paid': float(payment_data.get('amount_paid', 0)),
                        'balance': float(payment_data.get('balance', 0)),
                        'payment_status': payment_data.get('payment_status', 'Pending'),
                        'gcash_reference': payment_data.get('gcash_reference'),
                        'payment_notes': data.get('special_requests', '')
                    }
                    
                    payment_result = supabase.table('payments').insert(payment_record).execute()
                    
                    if payment_result.data:
                        print(f"Payment record created successfully for reservation {reservation_id}")
                    else:
                        print(f"Failed to create payment record for reservation {reservation_id}")
                        
                except Exception as payment_error:
                    print(f"Error creating payment record: {payment_error}")
                    # Don't fail the entire reservation creation if payment fails
            
            return jsonify({
                'success': True,
                'message': f'{service_type.title()} reservation created successfully',
                'reservation_id': reservation_id,
                'data': reservation_created
            })
        else:
            return jsonify({'error': 'Failed to create reservation'}), 500
            
    except Exception as e:
        print(f"Error creating {service_type} reservation: {e}")
        return jsonify({'error': f'Failed to create {service_type} reservation'}), 500

@app.route('/api/service-pricing')
def get_service_pricing():
    """Get service pricing information"""
    try:
        result = supabase.table('service_pricing').select('*').eq('is_active', True).execute()
        return jsonify({'success': True, 'data': result.data})
    except Exception as e:
        print(f"Error fetching service pricing: {e}")
        # Return default pricing if database fails
        default_pricing = [
            {'service_type': 'wedding', 'base_price': 15000.00, 'description': 'Wedding ceremony service fee'},
            {'service_type': 'baptism', 'base_price': 3000.00, 'description': 'Baptism ceremony service fee'},
            {'service_type': 'funeral', 'base_price': 8000.00, 'description': 'Funeral service fee'},
            {'service_type': 'confirmation', 'base_price': 2500.00, 'description': 'Confirmation ceremony service fee'}
        ]
        return jsonify({'success': True, 'data': default_pricing})

@app.route('/api/payments', methods=['POST'])
def create_payment():
    """Create a new payment record"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['reservation_id', 'service_type', 'payment_method', 'payment_type', 
                          'base_price', 'amount_due', 'amount_paid']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

        # Calculate payment status
        amount_due = float(data['amount_due'])
        amount_paid = float(data['amount_paid'])
        
        if amount_paid >= amount_due:
            payment_status = 'Paid'
            balance = 0
        elif amount_paid > 0:
            payment_status = 'Partial'
            balance = amount_due - amount_paid
        else:
            payment_status = 'Pending'
            balance = amount_due

        # Prepare payment data
        payment_data = {
            'id': str(uuid.uuid4()),
            'reservation_id': data['reservation_id'],
            'service_type': data['service_type'],
            'payment_method': data['payment_method'],
            'payment_type': data['payment_type'],
            'base_price': float(data['base_price']),
            'discount_type': data.get('discount_type', 'none'),
            'discount_value': float(data.get('discount_value', 0)),
            'discount_amount': float(data.get('discount_amount', 0)),
            'amount_due': amount_due,
            'amount_paid': amount_paid,
            'balance': balance,
            'payment_status': payment_status,
            'gcash_reference': data.get('gcash_reference'),
            'payment_notes': data.get('payment_notes', '')
        }

        # Insert payment record
        result = supabase.table('payments').insert(payment_data).execute()
        
        if result.data:
            return jsonify({'success': True, 'data': result.data[0], 'message': 'Payment created successfully'})
        else:
            return jsonify({'success': False, 'error': 'Failed to create payment record'}), 500
            
    except Exception as e:
        print(f"Error creating payment: {e}")
        return jsonify({'success': False, 'error': 'Failed to create payment'}), 500

@app.route('/api/payments/<reservation_identifier>')
def get_payment_by_reservation(reservation_identifier):
    """Get payment information for a specific reservation.
    Accepts either the human-readable reservation_id (e.g., RABC1234)
    or the reservations table UUID id.
    """
    try:
        print(f"Fetching payment for identifier: {reservation_identifier}")
        
        # Check if payments table exists by trying a simple query first
        try:
            test_result = supabase.table('payments').select('id').limit(1).execute()
            print(f"Payments table test: {test_result}")
        except Exception as table_error:
            print(f"Payments table doesn't exist or access denied: {table_error}")
            return jsonify({'success': False, 'error': 'Payment system not available'}), 404
        
        import re
        uuid_regex = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

        if uuid_regex.match(reservation_identifier):
            # Identifier is a UUID -> directly query payments by UUID FK
            try:
                result = supabase.table('payments').select('*').eq('reservation_id', reservation_identifier).execute()
                print(f"Payment query by UUID result: {result}")
                if result.data:
                    return jsonify({'success': True, 'data': result.data[0]})
            except Exception as qerr:
                print(f"Query error (payments by UUID): {qerr}")
        else:
            # Identifier is human-friendly reservation code -> resolve to reservations.id (UUID)
            try:
                res_lookup = supabase.table('reservations').select('id').eq('reservation_id', reservation_identifier).limit(1).execute()
                print(f"Reservation lookup by code result: {res_lookup}")
                if res_lookup.data:
                    resolved_uuid = res_lookup.data[0]['id']
                    result = supabase.table('payments').select('*').eq('reservation_id', resolved_uuid).execute()
                    print(f"Payment query by resolved UUID result: {result}")
                    if result.data:
                        return jsonify({'success': True, 'data': result.data[0]})
            except Exception as resolve_err:
                print(f"Error resolving reservation code to UUID or querying payments: {resolve_err}")

        print(f"No payment found for reservation identifier {reservation_identifier}")
        return jsonify({'success': False, 'error': 'Payment not found'}), 404
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error fetching payment: {str(e)}")
        print(f"Full error traceback: {error_details}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch payment',
            'error_details': error_details
        }), 500

@app.route('/api/payments/<payment_id>', methods=['PUT'])
def update_payment(payment_id):
    """Update payment information"""
    try:
        data = request.get_json()
        
        # Calculate updated payment status
        amount_due = float(data.get('amount_due', 0))
        amount_paid = float(data.get('amount_paid', 0))
        
        if amount_paid >= amount_due:
            payment_status = 'Paid'
            balance = 0
        elif amount_paid > 0:
            payment_status = 'Partial'
            balance = amount_due - amount_paid
        else:
            payment_status = 'Pending'
            balance = amount_due

        # Update payment data
        update_data = {
            'payment_method': data.get('payment_method'),
            'payment_type': data.get('payment_type'),
            'discount_type': data.get('discount_type', 'none'),
            'discount_value': float(data.get('discount_value', 0)),
            'discount_amount': float(data.get('discount_amount', 0)),
            'amount_due': amount_due,
            'amount_paid': amount_paid,
            'balance': balance,
            'payment_status': payment_status,
            'gcash_reference': data.get('gcash_reference'),
            'payment_notes': data.get('payment_notes', '')
        }

        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        result = supabase.table('payments').update(update_data).eq('id', payment_id).execute()
        
        if result.data:
            return jsonify({'success': True, 'data': result.data[0], 'message': 'Payment updated successfully'})
        else:
            return jsonify({'success': False, 'error': 'Payment not found'}), 404
            
    except Exception as e:
        print(f"Error updating payment: {e}")
        return jsonify({'success': False, 'error': 'Failed to update payment'}), 500

@app.route('/api/clients/search')
def search_clients():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        query = request.args.get('q', '')
        if len(query) < 2:
            return jsonify([])
        
        # Search clients in Supabase
        clients_result = supabase.table('clients').select('*').limit(10).execute()
        
        # Filter results based on search query
        filtered_clients = []
        for client in clients_result.data:
            if (query.lower() in client.get('first_name', '').lower() or
                query.lower() in client.get('last_name', '').lower() or
                query.lower() in client.get('phone', '').lower()):
                filtered_clients.append({
                    'id': client['id'],
                    'first_name': client['first_name'],
                    'last_name': client['last_name'],
                    'phone': client['phone'],
                    'email': client.get('email', ''),
                    'address': client.get('address', '')
                })
        
        return jsonify(filtered_clients[:10])  # Limit to 10 results
        
    except Exception as e:
        print(f"Error searching clients: {e}")
        return jsonify({'error': 'Failed to search clients'}), 500

@app.route('/api/reservations/<reservation_id>', methods=['GET'])
def get_reservation_details(reservation_id):
    """Get details for a specific reservation"""
    try:
        print(f"Fetching reservation details for ID: {reservation_id}")
        
        # Search in the main reservations table (service-specific tables don't exist)
        try:
            # Try searching by id field first
            result = supabase.table('reservations').select('*').eq('id', reservation_id).execute()
            if result.data:
                reservation = result.data[0]
                print(f"Found reservation by ID: {reservation}")
            else:
                # Try searching by reservation_id field if id didn't work
                result = supabase.table('reservations').select('*').eq('reservation_id', reservation_id).execute()
                if result.data:
                    reservation = result.data[0]
                    print(f"Found reservation by reservation_id: {reservation}")
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Reservation not found'
                    }), 404
            
            # Get client information
            client_name = 'Unknown Client'
            client_phone = ''
            client_email = ''
            
            if reservation.get('client_id'):
                try:
                    client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
                    if client_result.data:
                        client = client_result.data[0]
                        client_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
                        client_phone = client.get('phone', '')
                        client_email = client.get('email', '')
                except Exception as e:
                    print(f"Error fetching client data: {e}")
            
            # Get priest information
            priest_name = 'Not Assigned'
            priest_id = reservation.get('priest_id')
            print(f"DEBUG: Reservation priest_id = {priest_id}")
            if priest_id:
                try:
                    priest_result = supabase.table('priests').select('*').eq('id', priest_id).execute()
                    print(f"DEBUG: Priest query result = {priest_result.data}")
                    if priest_result.data:
                        priest = priest_result.data[0]
                        priest_name = f"{priest.get('first_name', '')} {priest.get('last_name', '')}".strip()
                        print(f"✅ Found priest for reservation: {priest_name}")
                    else:
                        print(f"⚠️ No priest found with ID: {priest_id}")
                except Exception as e:
                    print(f"❌ Error fetching priest data: {e}")
            else:
                print(f"⚠️ No priest_id in reservation data")
            
            # Extract service details from special_requests field (temporary solution)
            special_requests = reservation.get('special_requests', '')
            service_details = {}
            clean_special_requests = special_requests
            
            if '[SERVICE_DETAILS]' in special_requests and '[/SERVICE_DETAILS]' in special_requests:
                try:
                    import json
                    import re
                    # Extract service details JSON
                    match = re.search(r'\[SERVICE_DETAILS\](.*?)\[/SERVICE_DETAILS\]', special_requests, re.DOTALL)
                    if match:
                        service_details_json = match.group(1)
                        service_details = json.loads(service_details_json)
                        # Remove service details from special requests for display
                        clean_special_requests = re.sub(r'\n*\[SERVICE_DETAILS\].*?\[/SERVICE_DETAILS\]', '', special_requests, flags=re.DOTALL).strip()
                        print(f"DEBUG: Extracted service details: {service_details}")
                except Exception as e:
                    print(f"DEBUG: Error extracting service details: {e}")

            # Format the response with all information including service-specific details
            formatted_reservation = {
                'id': reservation.get('id'),
                'reservation_id': reservation.get('reservation_id'),
                'service_type': reservation.get('service_type'),
                'date': reservation.get('reservation_date'),
                'reservation_date': reservation.get('reservation_date'),
                'time_slot': reservation.get('reservation_time'),
                'time': reservation.get('reservation_time'),
                'reservation_time': reservation.get('reservation_time'),
                'status': reservation.get('status'),
                'contact_name': client_name,
                'contact_phone': client_phone,
                'contact_email': client_email,
                'priest_name': priest_name,
                'priest_id': reservation.get('priest_id'),
                'priest_response': reservation.get('priest_response'),  # PRIEST DECLINE REASON
                'location': reservation.get('location'),
                'attendees': reservation.get('attendees'),
                'special_requests': clean_special_requests,  # Clean special requests without service details
                'service_details': service_details,  # Extracted service-specific details
                'created_at': reservation.get('created_at'),
                'updated_at': reservation.get('updated_at'),
                # SECRETARY TRACKING FIELDS
                'created_by_secretary': reservation.get('created_by_secretary'),
                'created_by_email': reservation.get('created_by_email'),
                # ATTENDANCE TRACKING FIELDS
                'attendance_status': reservation.get('attendance_status'),
                'attendance_marked_at': reservation.get('attendance_marked_at'),
                'attendance_marked_by': reservation.get('attendance_marked_by')
            }
            
            print(f"DEBUG: Formatted reservation with service details: {formatted_reservation}")
            
            return jsonify({
                'success': True,
                'data': formatted_reservation
            })
                    
        except Exception as table_error:
            print(f"Error searching reservations table: {table_error}")
            return jsonify({
                'success': False,
                'error': f'Database error: {str(table_error)}'
            }), 500
        
    except Exception as e:
        print(f"Error fetching reservation details: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch reservation details: {str(e)}'
        }), 500

@app.route('/api/reservations/<reservation_id>', methods=['PUT'])
def update_reservation(reservation_id):
    """Update an existing reservation"""
    try:
        print(f"Updating reservation: {reservation_id}")
        
        # Get the request data
        data = request.get_json()
        print(f"Update data received: {data}")
        
        # Validate required fields
        required_fields = ['service_type', 'reservation_date', 'time_slot']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate contact information
        if not (data.get('contact_first_name', '').strip() and data.get('contact_last_name', '').strip()):
            return jsonify({
                'success': False,
                'error': 'Please provide both first name and last name'
            }), 400
        
        # First, get the current reservation to find the client_id
        current_reservation = supabase.table('reservations').select('*').eq('id', reservation_id).execute()
        if not current_reservation.data:
            return jsonify({
                'success': False,
                'error': 'Reservation not found'
            }), 404
        
        reservation = current_reservation.data[0]
        client_id = reservation.get('client_id')
        
        # Update client information if client_id exists
        if client_id and ('contact_first_name' in data or 'contact_last_name' in data or 'contact_phone' in data):
            client_update_data = {}
            
            if 'contact_first_name' in data and data['contact_first_name'].strip():
                client_update_data['first_name'] = data['contact_first_name'].strip()
            if 'contact_last_name' in data and data['contact_last_name'].strip():
                client_update_data['last_name'] = data['contact_last_name'].strip()
            if 'contact_phone' in data and data['contact_phone'].strip():
                client_update_data['phone'] = data['contact_phone'].strip()
            
            if client_update_data:
                try:
                    client_result = supabase.table('clients').update(client_update_data).eq('id', client_id).execute()
                    print(f"Updated client data: {client_update_data}")
                except Exception as e:
                    print(f"Error updating client: {e}")
                    # Don't fail the reservation update if client update fails
        
        # Prepare reservation update data - only include fields that exist in reservations table
        update_data = {
            'service_type': data['service_type'],
            'reservation_date': data['reservation_date'],
            'updated_at': datetime.now().isoformat()
        }
        
        # Handle time_slot field (only store in reservation_time, as time_slot doesn't exist in DB)
        if 'time_slot' in data:
            update_data['reservation_time'] = data['time_slot']
            # Don't set time_slot as it doesn't exist in the database schema
        
        # Handle special requests
        if 'special_requests' in data:
            update_data['special_requests'] = data.get('special_requests', '')
        
        print(f"Reservation update data: {update_data}")
        print(f"Client ID: {client_id}")
        
        # Handle priest assignment if provided
        if 'priest_id' in data and data['priest_id']:
            update_data['priest_id'] = data['priest_id']
            # If priest is being changed, reset status to waiting for priest approval
            update_data['status'] = 'waiting_priest_approval'
        
        print(f"Prepared update data: {update_data}")
        
        # Update the reservation in database
        result = supabase.table('reservations').update(update_data).eq('id', reservation_id).execute()
        
        print(f"Update result: {result}")
        
        if result.data:
            # Get the updated reservation data
            updated_reservation = result.data[0]
            
            # Fetch client information to include in response
            if client_id:
                try:
                    client_result = supabase.table('clients').select('*').eq('id', client_id).execute()
                    if client_result.data:
                        client = client_result.data[0]
                        # Add client info to reservation data
                        updated_reservation['contact_name'] = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
                        updated_reservation['contact_first_name'] = client.get('first_name', '')
                        updated_reservation['contact_last_name'] = client.get('last_name', '')
                        updated_reservation['contact_phone'] = client.get('phone', '')
                        updated_reservation['contact_email'] = client.get('email', '')
                except Exception as e:
                    print(f"Error fetching updated client info: {e}")
            
            # Fetch priest information to include in response
            if updated_reservation.get('priest_id'):
                try:
                    priest_result = supabase.table('priests').select('*').eq('id', updated_reservation['priest_id']).execute()
                    if priest_result.data:
                        priest = priest_result.data[0]
                        updated_reservation['priest_name'] = f"{priest.get('first_name', '')} {priest.get('last_name', '')}".strip()
                except Exception as e:
                    print(f"Error fetching priest info: {e}")
            
            # If priest was changed, send notification email
            if 'priest_id' in data and data['priest_id']:
                try:
                    # Get priest details
                    priest_result = supabase.table('priests').select('*').eq('id', data['priest_id']).execute()
                    if priest_result.data:
                        priest = priest_result.data[0]
                        priest_name = f"{priest['first_name']} {priest['last_name']}"
                        
                        # Prepare email data
                        email_data = {
                            'service_type': updated_reservation['service_type'],
                            'date': updated_reservation['reservation_date'],
                            'time': updated_reservation.get('reservation_time', updated_reservation.get('time_slot', '')),
                            'client_name': updated_reservation.get('contact_name', 'Unknown'),
                            'client_phone': updated_reservation.get('contact_phone', ''),
                            'special_requests': updated_reservation.get('special_requests', 'None')
                        }
                        
                        # Send notification email to priest
                        send_priest_notification_email(
                            priest['email'],
                            priest_name,
                            email_data,
                            updated_reservation['id'],
                            priest['id']
                        )
                        print(f"Notification email sent to priest: {priest['email']}")
                except Exception as email_error:
                    print(f"Error sending priest notification email: {email_error}")
                    # Don't fail the update if email fails
            
            print(f"✅ Returning updated reservation with complete data: {updated_reservation}")
            
            return jsonify({
                'success': True,
                'data': updated_reservation,
                'message': 'Reservation updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update reservation - no data returned'
            }), 500
            
    except Exception as e:
        print(f"Error updating reservation: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to update reservation: {str(e)}'
        }), 500

@app.route('/api/reservations/<reservation_id>/attendance', methods=['POST'])
def mark_attendance(reservation_id):
    """Mark attendance for a reservation (attended or no_show)"""
    try:
        print(f"Marking attendance for reservation: {reservation_id}")
        
        # Get the request data
        data = request.get_json()
        attendance_status = data.get('attendance_status')
        
        # Validate attendance status
        if attendance_status not in ['attended', 'no_show', 'cancelled']:
            return jsonify({
                'success': False,
                'error': 'Invalid attendance status. Must be "attended", "no_show", or "cancelled"'
            }), 400
        
        # Get current user from session (if available)
        user_id = session.get('user_id')
        
        # CANCELLATION REFUND POLICY: If cancelled, process automatic refund
        if attendance_status == 'cancelled':
            print("🔄 Processing cancellation refund policy...")
            
            # Get the reservation to check service type and payment info
            reservation_result = supabase.table('reservations').select('*').eq('id', reservation_id).execute()
            if not reservation_result.data:
                # Try with reservation_id field
                reservation_result = supabase.table('reservations').select('*').eq('reservation_id', reservation_id).execute()
            
            if reservation_result.data:
                reservation = reservation_result.data[0]
                service_type = reservation.get('service_type', '')
                actual_reservation_id = reservation.get('id')
                
                print(f"Service type: {service_type}")
                
                # Check if this service type requires payment (Wedding, Baptism, Funeral)
                if service_type in ['wedding', 'baptism', 'funeral']:
                    print(f"💰 Service requires payment - processing refund for {service_type}")
                    
                    # Find payment record for this reservation
                    payment_result = supabase.table('payments').select('*').eq('reservation_id', actual_reservation_id).execute()
                    
                    if payment_result.data:
                        payment = payment_result.data[0]
                        payment_id = payment.get('id')
                        original_amount = payment.get('amount_paid', 0)
                        
                        print(f"💵 Found payment record - Original amount: ₱{original_amount}")
                        
                        # Update payment to reflect refund
                        # Note: Keep status as 'Pending' but reset amount to 0 (DB constraints don't allow 'cancelled' or 'refunded')
                        refund_data = {
                            'payment_status': 'Pending',  # Keep as valid status
                            'amount_paid': 0,  # Reset to 0 (full refund)
                            'balance': payment.get('amount_due', 0),  # Balance becomes full amount (since paid = 0)
                            'payment_type': 'None',  # Reset payment type
                            'updated_at': datetime.now().isoformat()
                        }
                        
                        refund_result = supabase.table('payments').update(refund_data).eq('id', payment_id).execute()
                        
                        if refund_result.data:
                            print(f"✅ Payment refunded successfully - Amount: ₱{original_amount} → ₱0")
                        else:
                            print("⚠️ Payment refund update failed")
                    else:
                        print("ℹ️ No payment record found for this reservation")
                else:
                    print(f"ℹ️ Service type '{service_type}' does not require refund (free service)")
        
        # Prepare update data
        update_data = {
            'attendance_status': attendance_status,
            'attendance_marked_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Add user who marked attendance if available
        if user_id:
            update_data['attendance_marked_by'] = user_id
        
        print(f"Attendance update data: {update_data}")
        print(f"Trying to update reservation with ID: {reservation_id}")
        
        # Update the reservation - try by UUID first
        result = supabase.table('reservations').update(update_data).eq('id', reservation_id).execute()
        
        if result.data:
            print(f"✅ Attendance marked successfully using UUID: {attendance_status}")
            print(f"Updated reservation: {result.data[0].get('id')} - {result.data[0].get('reservation_id')}")
            return jsonify({
                'success': True,
                'message': f'Attendance marked as {attendance_status}',
                'data': result.data[0]
            })
        else:
            # Try with reservation_id field (the code like RFOC1GATF)
            print(f"UUID not found, trying with reservation_id field: {reservation_id}")
            result = supabase.table('reservations').update(update_data).eq('reservation_id', reservation_id).execute()
            
            if result.data:
                print(f"✅ Attendance marked successfully using reservation_id: {attendance_status}")
                print(f"Updated reservation: {result.data[0].get('id')} - {result.data[0].get('reservation_id')}")
                return jsonify({
                    'success': True,
                    'message': f'Attendance marked as {attendance_status}',
                    'data': result.data[0]
                })
            else:
                print(f"❌ Reservation not found with either id or reservation_id: {reservation_id}")
                return jsonify({
                    'success': False,
                    'error': 'Reservation not found'
                }), 404
                
    except Exception as e:
        print(f"Error marking attendance: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Failed to mark attendance: {str(e)}'
        }), 500

@app.route('/api/reservations/<reservation_id>/approve', methods=['POST'])
def approve_reservation(reservation_id):
    try:
        print(f"Approving reservation: {reservation_id}")
        
        # Update reservation status in main reservations table
        result = supabase.table('reservations').update({
            'status': 'approved',
            'updated_at': datetime.now().isoformat()
        }).eq('id', reservation_id).execute()
        
        print(f"Update result: {result}")
        
        if result.data:
            return jsonify({
                'success': True,
                'message': 'Reservation approved successfully',
                'data': result.data[0]
            })
        else:
            # Try updating by reservation_id field instead
            result = supabase.table('reservations').update({
                'status': 'approved',
                'updated_at': datetime.now().isoformat()
            }).eq('reservation_id', reservation_id).execute()
            
            if result.data:
                return jsonify({
                    'success': True,
                    'message': 'Reservation approved successfully',
                    'data': result.data[0]
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Reservation not found'
                }), 404
                
    except Exception as e:
        print(f"Error approving reservation: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to approve reservation: {str(e)}'
        }), 500

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        from datetime import datetime, timedelta
        
        today = date.today()
        today_str = today.isoformat()
        
        # Calculate week range (today + next 6 days)
        week_end = today + timedelta(days=6)
        week_end_str = week_end.isoformat()
        
        # Calculate month range
        month_start = today.replace(day=1).isoformat()
        if today.month == 12:
            month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        month_end_str = month_end.isoformat()
        
        # Get all reservations for stats calculation
        all_reservations = supabase.table('reservations').select('*').execute()
        reservations = all_reservations.data
        
        # Get all payments for revenue calculation
        all_payments = supabase.table('payments').select('*').execute()
        payments = all_payments.data
        
        # Calculate basic stats
        total_reservations = len(reservations)
        pending_reservations = len([r for r in reservations if r['status'] == 'pending'])
        approved_reservations = len([r for r in reservations if r['status'] == 'approved'])
        completed_reservations = len([r for r in reservations if r['status'] == 'completed'])
        
        # Today's reservations
        today_reservations = len([r for r in reservations if r.get('reservation_date') == today_str])
        
        # This week's reservations (today to next 6 days)
        week_reservations = len([
            r for r in reservations 
            if r.get('reservation_date') and today_str <= r['reservation_date'] <= week_end_str
        ])
        
        # Pending priest approvals (waiting_priest_approval status)
        pending_priest_approvals = len([
            r for r in reservations 
            if r['status'] in ['pending', 'waiting_priest_approval']
        ])
        
        # This month's revenue
        month_revenue = sum([
            float(p.get('amount_paid', 0) or 0) 
            for p in payments 
            if p.get('created_at') and p['created_at'][:7] == today_str[:7]  # Match YYYY-MM
        ])
        
        # Service type counts
        service_counts = {
            'wedding': len([r for r in reservations if r['service_type'] == 'wedding']),
            'baptism': len([r for r in reservations if r['service_type'] == 'baptism']),
            'funeral': len([r for r in reservations if r['service_type'] == 'funeral']),
            'confirmation': len([r for r in reservations if r['service_type'] == 'confirmation'])
        }
        
        stats = {
            'total_reservations': total_reservations,
            'pending_reservations': pending_reservations,
            'approved_reservations': approved_reservations,
            'completed_reservations': completed_reservations,
            'today_reservations': today_reservations,
            'week_reservations': week_reservations,
            'pending_priest_approvals': pending_priest_approvals,
            'month_revenue': month_revenue,
            'service_counts': service_counts
        }
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return jsonify({'error': 'Failed to fetch statistics'}), 500

@app.route('/api/debug/payments', methods=['GET'])
def debug_payments():
    """Debug endpoint to check payments data"""
    try:
        # Get all payments
        all_payments = supabase.table('payments').select('*').execute()
        payments = all_payments.data
        
        # Get current month
        today = date.today()
        current_month = today.strftime('%Y-%m')
        
        # Filter this month's payments
        month_payments = [
            p for p in payments 
            if p.get('created_at') and p['created_at'][:7] == current_month
        ]
        
        # Calculate total
        total = sum([float(p.get('amount_paid', 0) or 0) for p in month_payments])
        
        return jsonify({
            'total_payments': len(payments),
            'month_payments_count': len(month_payments),
            'month_total': total,
            'current_month': current_month,
            'month_payments': month_payments
        })
        
    except Exception as e:
        print(f"Error in debug payments: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/today-schedule', methods=['GET'])
def get_today_schedule():
    """Get detailed schedule for today's reservations"""
    try:
        today = date.today().isoformat()
        
        # Get today's reservations
        reservations_result = supabase.table('reservations').select('*').eq('reservation_date', today).execute()
        reservations = reservations_result.data
        
        print(f"Found {len(reservations)} reservations for today: {today}")
        
        # Build detailed schedule
        schedule = []
        for reservation in reservations:
            print(f"Processing reservation: {reservation.get('id')}")
            print(f"  - contact_name: {reservation.get('contact_name')}")
            print(f"  - contact_phone: {reservation.get('contact_phone')}")
            print(f"  - client_id: {reservation.get('client_id')}")
            print(f"  - priest_id: {reservation.get('priest_id')}")
            
            # Get client info - clients table has first_name, last_name, phone
            client_name = 'Unknown Client'
            client_phone = 'N/A'
            
            if reservation.get('client_id'):
                try:
                    client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
                    if client_result.data and len(client_result.data) > 0:
                        client = client_result.data[0]
                        # Clients table has first_name and last_name
                        first_name = client.get('first_name', '')
                        last_name = client.get('last_name', '')
                        client_name = f"{first_name} {last_name}".strip() or 'Unknown Client'
                        client_phone = client.get('phone', 'N/A')
                        print(f"  - Found client: {client_name} ({client_phone})")
                except Exception as e:
                    print(f"  - Error fetching client: {e}")
            
            # Get priest info - priests table has first_name, last_name
            priest_name = 'Not Assigned'
            if reservation.get('priest_id'):
                try:
                    priest_result = supabase.table('priests').select('*').eq('id', reservation['priest_id']).execute()
                    if priest_result.data and len(priest_result.data) > 0:
                        priest = priest_result.data[0]
                        # Priests table has first_name and last_name
                        first_name = priest.get('first_name', '')
                        last_name = priest.get('last_name', '')
                        priest_name = f"{first_name} {last_name}".strip() or 'Not Assigned'
                        print(f"  - Found priest: {priest_name}")
                except Exception as e:
                    print(f"  - Error fetching priest: {e}")
            
            # Get time slot - database has reservation_time field
            time_slot = reservation.get('reservation_time', 'Not set')
            if time_slot and time_slot != 'Not set':
                # Format time if it's in HH:MM:SS format
                try:
                    from datetime import datetime
                    if isinstance(time_slot, str) and ':' in time_slot:
                        time_obj = datetime.strptime(time_slot.split('.')[0], '%H:%M:%S')
                        time_slot = time_obj.strftime('%I:%M %p')
                except:
                    pass
            
            schedule.append({
                'id': reservation['id'],
                'reservation_id': reservation.get('reservation_id', 'N/A'),
                'time_slot': time_slot,
                'service_type': reservation.get('service_type', 'Unknown'),
                'status': reservation.get('status', 'pending'),
                'client_name': client_name,
                'client_phone': client_phone,
                'priest_name': priest_name,
                'created_at': reservation.get('created_at', '')
            })
        
        # Sort by time_slot
        schedule.sort(key=lambda x: x['time_slot'])
        
        print(f"Returning {len(schedule)} schedule items")
        
        return jsonify({
            'success': True,
            'data': schedule,
            'count': len(schedule)
        })
        
    except Exception as e:
        print(f"Error getting today's schedule: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch today\'s schedule'}), 500

@app.route('/api/dashboard/recent-activities', methods=['GET'])
def get_recent_activities():
    """Get recent activities (reservations, approvals, updates)"""
    try:
        from datetime import datetime, timedelta
        
        # Get recent reservations (last 10, sorted by created_at)
        reservations_result = supabase.table('reservations').select('*').order('created_at', desc=True).limit(10).execute()
        reservations = reservations_result.data
        
        # Get all clients
        clients_result = supabase.table('clients').select('*').execute()
        clients = {c['id']: c for c in clients_result.data}
        
        # Get all priests
        priests_result = supabase.table('priests').select('*').execute()
        priests = {p['id']: p for p in priests_result.data}
        
        # Get recent payments (last 10)
        payments_result = supabase.table('payments').select('*').order('created_at', desc=True).limit(10).execute()
        payments = payments_result.data
        
        # Build activities list
        activities = []
        
        # Add reservation activities
        for reservation in reservations:
            client_id = reservation.get('client_id')
            priest_id = reservation.get('priest_id')
            
            client = clients.get(client_id, {})
            priest = priests.get(priest_id, {})
            
            # Get client name - database has first_name and last_name
            client_first = client.get('first_name', '')
            client_last = client.get('last_name', '')
            client_name = f"{client_first} {client_last}".strip() or 'Unknown'
            
            # Get priest name - database has first_name and last_name
            priest_first = priest.get('first_name', '')
            priest_last = priest.get('last_name', '')
            priest_name = f"{priest_first} {priest_last}".strip() or 'Unknown'
            
            # Get time - database has reservation_time not time_slot
            reservation_time = reservation.get('reservation_time', 'N/A')
            if reservation_time and reservation_time != 'N/A':
                try:
                    from datetime import datetime
                    if isinstance(reservation_time, str) and ':' in reservation_time:
                        time_obj = datetime.strptime(reservation_time.split('.')[0], '%H:%M:%S')
                        reservation_time = time_obj.strftime('%I:%M %p')
                except:
                    pass
            
            status = reservation.get('status', 'pending')
            service_type = reservation.get('service_type', 'Unknown')
            
            # Determine activity type and message
            if status == 'pending':
                activity_type = 'new_reservation'
                icon = 'fa-plus-circle'
                color = '#3b82f6'
                message = f"New {service_type} reservation from {client_name}"
            elif status == 'approved' or status == 'confirmed':
                activity_type = 'approved'
                icon = 'fa-check-circle'
                color = '#10b981'
                message = f"{service_type.title()} reservation approved for {client_name}"
            elif status == 'declined':
                activity_type = 'declined'
                icon = 'fa-times-circle'
                color = '#ef4444'
                message = f"{service_type.title()} reservation declined for {client_name}"
            elif status == 'waiting_priest_approval':
                activity_type = 'priest_assigned'
                icon = 'fa-user-tie'
                color = '#f59e0b'
                message = f"Priest assigned to {service_type} reservation - {priest_name}"
            else:
                activity_type = 'updated'
                icon = 'fa-edit'
                color = '#6b7280'
                message = f"{service_type.title()} reservation updated for {client_name}"
            
            activities.append({
                'id': reservation['id'],
                'type': activity_type,
                'icon': icon,
                'color': color,
                'message': message,
                'details': f"{service_type.title()} - {reservation.get('reservation_date', 'N/A')} at {reservation_time}",
                'timestamp': reservation.get('created_at', ''),
                'reservation_id': reservation.get('reservation_id', 'N/A')
            })
        
        # Add payment activities
        for payment in payments:
            reservation_id = payment.get('reservation_id')
            payment_status = payment.get('payment_status', 'pending')
            amount_paid = payment.get('amount_paid', 0)
            
            # Find corresponding reservation
            matching_reservation = next((r for r in reservations if r.get('reservation_id') == reservation_id), None)
            client_name = 'Unknown'
            if matching_reservation:
                client_id = matching_reservation.get('client_id')
                client = clients.get(client_id, {})
                client_name = client.get('contact_name', 'Unknown')
            
            if payment_status == 'paid':
                activity_type = 'payment_full'
                icon = 'fa-money-bill-wave'
                color = '#10b981'
                message = f"Full payment received from {client_name}"
            elif payment_status == 'partial':
                activity_type = 'payment_partial'
                icon = 'fa-coins'
                color = '#f59e0b'
                message = f"Partial payment received from {client_name}"
            else:
                continue  # Skip pending payments
            
            activities.append({
                'id': payment['id'],
                'type': activity_type,
                'icon': icon,
                'color': color,
                'message': message,
                'details': f"Amount: ₱{float(amount_paid):,.2f}",
                'timestamp': payment.get('created_at', ''),
                'reservation_id': reservation_id
            })
        
        # Sort all activities by timestamp (most recent first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Limit to 15 most recent activities
        activities = activities[:15]
        
        return jsonify({
            'success': True,
            'data': activities,
            'count': len(activities)
        })
        
    except Exception as e:
        print(f"Error getting recent activities: {e}")
        return jsonify({'error': 'Failed to fetch recent activities'}), 500

@app.route('/api/dashboard/pending-tasks', methods=['GET'])
def get_pending_tasks():
    """Get pending tasks that require secretary action"""
    try:
        from datetime import datetime, timedelta
        
        today = date.today()
        today_str = today.isoformat()
        
        # Get all reservations
        reservations_result = supabase.table('reservations').select('*').execute()
        reservations = reservations_result.data
        
        # Get all clients
        clients_result = supabase.table('clients').select('*').execute()
        clients = {c['id']: c for c in clients_result.data}
        
        # Get all priests
        priests_result = supabase.table('priests').select('*').execute()
        priests = {p['id']: p for p in priests_result.data}
        
        # Get all payments
        payments_result = supabase.table('payments').select('*').execute()
        payments = payments_result.data
        
        tasks = []
        
        # Task 1: Pending reservations (need priest assignment)
        pending_reservations = [r for r in reservations if r['status'] == 'pending']
        if pending_reservations:
            tasks.append({
                'id': 'pending_reservations',
                'type': 'pending_approval',
                'priority': 'high',
                'icon': 'fa-user-clock',
                'color': '#ef4444',
                'title': f"{len(pending_reservations)} Pending Reservation{'' if len(pending_reservations) == 1 else 's'}",
                'description': 'Need to assign priest and review details',
                'count': len(pending_reservations),
                'action': 'Review Now',
                'action_link': '#reservations'
            })
        
        # Task 2: Declined reservations (need reassignment)
        declined_reservations = [r for r in reservations if r['status'] == 'declined']
        if declined_reservations:
            tasks.append({
                'id': 'declined_reservations',
                'type': 'declined',
                'priority': 'high',
                'icon': 'fa-exclamation-triangle',
                'color': '#f59e0b',
                'title': f"{len(declined_reservations)} Declined Reservation{'' if len(declined_reservations) == 1 else 's'}",
                'description': 'Need to reassign priest or contact client',
                'count': len(declined_reservations),
                'action': 'Reassign',
                'action_link': '#reservations'
            })
        
        # Task 3: Waiting priest approval
        waiting_approval = [r for r in reservations if r['status'] == 'waiting_priest_approval']
        if waiting_approval:
            tasks.append({
                'id': 'waiting_approval',
                'type': 'waiting',
                'priority': 'medium',
                'icon': 'fa-clock',
                'color': '#3b82f6',
                'title': f"{len(waiting_approval)} Awaiting Priest Response",
                'description': 'Reservations waiting for priest approval',
                'count': len(waiting_approval),
                'action': 'View Status',
                'action_link': '#reservations'
            })
        
        # Task 4: Incomplete payment information
        incomplete_payments = []
        for reservation in reservations:
            if reservation['service_type'] in ['wedding', 'baptism', 'funeral']:
                # Check if payment exists
                reservation_id = reservation.get('reservation_id')
                payment = next((p for p in payments if p.get('reservation_id') == reservation_id), None)
                if not payment or not payment.get('payment_status'):
                    incomplete_payments.append(reservation)
        
        if incomplete_payments:
            tasks.append({
                'id': 'incomplete_payments',
                'type': 'payment',
                'priority': 'medium',
                'icon': 'fa-money-bill-wave',
                'color': '#10b981',
                'title': f"{len(incomplete_payments)} Missing Payment Info",
                'description': 'Reservations need payment details',
                'count': len(incomplete_payments),
                'action': 'Update',
                'action_link': '#reservations'
            })
        
        # Task 5: Upcoming reservations (next 3 days)
        three_days_later = (today + timedelta(days=3)).isoformat()
        upcoming = [
            r for r in reservations 
            if r.get('reservation_date') and today_str <= r['reservation_date'] <= three_days_later
            and r['status'] in ['approved', 'confirmed']
        ]
        
        if upcoming:
            tasks.append({
                'id': 'upcoming_reservations',
                'type': 'upcoming',
                'priority': 'low',
                'icon': 'fa-calendar-check',
                'color': '#8b5cf6',
                'title': f"{len(upcoming)} Upcoming Reservation{'' if len(upcoming) == 1 else 's'}",
                'description': 'In the next 3 days - may need confirmation calls',
                'count': len(upcoming),
                'action': 'View List',
                'action_link': '#reservations'
            })
        
        # Task 6: Today's reservations that need attention
        today_reservations = [
            r for r in reservations 
            if r.get('reservation_date') == today_str
            and r['status'] in ['approved', 'confirmed']
        ]
        
        if today_reservations:
            tasks.append({
                'id': 'today_reservations',
                'type': 'today',
                'priority': 'high',
                'icon': 'fa-bell',
                'color': '#ec4899',
                'title': f"{len(today_reservations)} Reservation{'' if len(today_reservations) == 1 else 's'} Today",
                'description': 'Scheduled for today - ensure everything is ready',
                'count': len(today_reservations),
                'action': 'View Schedule',
                'action_link': '#dashboard'
            })
        
        # Sort tasks by priority (high -> medium -> low)
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        tasks.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return jsonify({
            'success': True,
            'data': tasks,
            'count': len(tasks)
        })
        
    except Exception as e:
        print(f"Error getting pending tasks: {e}")
        return jsonify({'error': 'Failed to fetch pending tasks'}), 500

# Initialize default admin user
def init_admin_user():
    """Create default admin user and secretary users if not exists"""
    try:
        # Create admin user
        existing_admin = get_user_by_username('admin')
        if not existing_admin:
            create_user('admin', 'admin@churchease.com', 'admin123', 'admin')
            print("Default admin user created")
        
        # Create secretary users
        secretary_accounts = [
            {'username': 'cyril.arbatin', 'email': 'cyril.arbatin@churchease.com', 'password': 'cyril123'},
            {'username': 'hana.umali', 'email': 'hana.umali@churchease.com', 'password': 'hana123'}
        ]
        
        for secretary in secretary_accounts:
            existing_secretary = get_user_by_username(secretary['username'])
            if not existing_secretary:
                create_user(secretary['username'], secretary['email'], secretary['password'], 'secretary')
                print(f"Secretary user created: {secretary['username']}")
            else:
                print(f"Secretary user already exists: {secretary['username']}")
                
    except Exception as e:
        print(f"Error initializing users: {e}")

# Events API Endpoints
@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all events"""
    try:
        print("Attempting to fetch events from database...")
        
        # Query events first, then get priest information separately
        result = supabase.table('events').select('*').order('event_date', desc=False).execute()
        
        print(f"Events query successful. Found {len(result.data)} events")
        
        events = []
        for event in result.data:
            events.append({
                'id': event['id'],
                'event_name': event['event_name'],
                'event_type': event['event_type'],
                'description': event['description'],
                'event_date': event['event_date'],
                'start_time': event['start_time'],
                'end_time': event['end_time'],
                'assigned_priest': event.get('assigned_priest'),
                'status': event['status'],
                'created_at': event['created_at'],
                'created_by_secretary': event.get('created_by_secretary'),
                'created_by_email': event.get('created_by_email')
            })
        
        return jsonify({
            'success': True,
            'data': events
        })
        
    except Exception as e:
        print(f"Error fetching events: {e}")
        print(f"Error type: {type(e)}")
        print(f"Error details: {str(e)}")
        
        # If table doesn't exist, return empty array instead of error
        if "relation" in str(e).lower() and "does not exist" in str(e).lower():
            print("Events table does not exist. Returning empty array.")
            return jsonify({
                'success': True,
                'data': [],
                'message': 'Events table not found. Please run database setup.'
            })
        
        return jsonify({
            'success': False,
            'error': f'Failed to fetch events: {str(e)}'
        }), 500

@app.route('/api/events/all', methods=['GET'])
def get_all_events():
    """Get all events with secretary information for admin dashboard"""
    try:
        print("Fetching all events with secretary info...")
        
        # Query events first
        events_result = supabase.table('events').select('*').order('event_date', desc=True).execute()
        
        print(f"Events query successful. Found {len(events_result.data)} events")
        
        # Get all user IDs from events
        user_ids = [event['created_by'] for event in events_result.data if event.get('created_by')]
        
        # Fetch users separately if there are any
        users_dict = {}
        if user_ids:
            users_result = supabase.table('users').select('id, full_name').in_('id', user_ids).execute()
            users_dict = {user['id']: user['full_name'] for user in users_result.data}
        
        events = []
        for event in events_result.data:
            # Get secretary name from users dictionary or from created_by_secretary column
            secretary_name = event.get('created_by_secretary') or users_dict.get(event.get('created_by'), 'N/A')
            
            events.append({
                'id': event['id'],
                'event_title': event.get('event_name') or event.get('title', 'Untitled Event'),  # Check both event_name and title
                'event_type': event.get('event_type') or event.get('type', 'other'),  # Check both event_type and type columns
                'event_description': event.get('description', ''),
                'event_date': event['event_date'],
                'start_time': event.get('start_time'),
                'end_time': event.get('end_time'),
                'location': event.get('location', ''),
                'organizer': event.get('organizer', ''),
                'secretary_name': secretary_name,
                'created_by_secretary': event.get('created_by_secretary'),  # Include the actual column value
                'created_at': event['created_at'],
                'status': event.get('status', 'active')
            })
        
        return jsonify({
            'success': True,
            'data': events
        })
        
    except Exception as e:
        print(f"Error fetching events: {e}")
        
        # If table doesn't exist, return empty array
        if "relation" in str(e).lower() and "does not exist" in str(e).lower():
            return jsonify({
                'success': True,
                'data': [],
                'message': 'Events table not found.'
            })
        
        return jsonify({
            'success': False,
            'error': f'Failed to fetch events: {str(e)}'
        }), 500

@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event"""
    try:
        print("Attempting to create new event...")
        data = request.get_json()
        print(f"Received event data: {data}")
        
        # Validate required fields
        required_fields = ['event_name', 'event_type', 'event_date', 'start_time']
        for field in required_fields:
            if not data.get(field):
                print(f"Missing required field: {field}")
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Get current user (for now, use a default user ID if session not available)
        user_id = session.get('user_id')
        print(f"Session user_id: {user_id}")
        
        # Check if user_id is a valid UUID format
        if user_id and not user_id.lower().startswith(('sec-', 'admin-')):
            # It's already a UUID, use it
            print(f"Using session UUID: {user_id}")
        else:
            # Need to look up the actual UUID from the username
            if user_id:
                # Extract username from session (e.g., "sec-maria.santos" -> "maria.santos")
                username = user_id.lower().replace('sec-', '').replace('admin-', '')
                print(f"Looking up user by username: {username}")
                
                user_result = supabase.table('users').select('id').eq('username', username).limit(1).execute()
                print(f"User lookup result: {user_result.data}")
                
                if user_result.data:
                    user_id = user_result.data[0]['id']
                    print(f"Found user UUID: {user_id}")
                else:
                    print(f"User not found for username: {username}")
                    user_id = None
            
            if not user_id:
                # For testing purposes, get any user (admin or secretary)
                print("No valid user found, looking for any available user...")
                user_result = supabase.table('users').select('id').limit(1).execute()
                print(f"Available users: {user_result.data}")
                
                if user_result.data:
                    user_id = user_result.data[0]['id']
                    print(f"Using fallback user_id: {user_id}")
                else:
                    print("No users found in database!")
                    return jsonify({
                        'success': False,
                        'error': 'No user found to create event. Please ensure users exist in database.'
                    }), 401
        
        # CHECK FOR CONFLICTS with existing reservations
        event_date = data['event_date']
        start_time = data['start_time']
        end_time = data.get('end_time')
        
        print(f"Checking for conflicts on {event_date} from {start_time} to {end_time}")
        
        # Get all approved/confirmed reservations on the same date
        # Note: We don't need contact_name for conflict checking, just need to know if there's a conflict
        reservations_result = supabase.table('reservations')\
            .select('id, reservation_id, service_type, reservation_time, client_id')\
            .eq('reservation_date', event_date)\
            .in_('status', ['approved', 'confirmed'])\
            .execute()
        
        if reservations_result.data:
            print(f"Found {len(reservations_result.data)} reservations on {event_date}")
            
            # Check each reservation for time conflicts
            for reservation in reservations_result.data:
                res_start = reservation.get('reservation_time')
                
                if res_start:
                    # Parse times for comparison
                    from datetime import datetime, timedelta
                    
                    # Convert time strings to datetime objects for comparison
                    def parse_time(time_str):
                        """Parse time string to datetime object"""
                        try:
                            # Handle HH:MM:SS format
                            if isinstance(time_str, str):
                                time_parts = time_str.split(':')
                                hour = int(time_parts[0])
                                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                                return datetime.strptime(f"{hour:02d}:{minute:02d}", "%H:%M")
                            return None
                        except:
                            return None
                    
                    # Get service duration (in hours)
                    service_durations = {
                        'wedding': 2,
                        'baptism': 1,
                        'funeral': 1.5,
                        'confirmation': 1
                    }
                    
                    service_type = reservation.get('service_type', 'wedding')
                    duration_hours = service_durations.get(service_type, 2)
                    
                    # Calculate reservation end time
                    res_start_dt = parse_time(res_start)
                    if res_start_dt:
                        res_end_dt = res_start_dt + timedelta(hours=duration_hours)
                        
                        # Parse event times
                        event_start_dt = parse_time(start_time)
                        event_end_dt = parse_time(end_time) if end_time else None
                        
                        if event_start_dt:
                            # If no end time specified for event, assume 2 hours
                            if not event_end_dt:
                                event_end_dt = event_start_dt + timedelta(hours=2)
                            
                            # Check for overlap
                            # Events overlap if: (event_start < res_end) AND (event_end > res_start)
                            has_conflict = (event_start_dt < res_end_dt) and (event_end_dt > res_start_dt)
                            
                            if has_conflict:
                                # Get client name from clients table
                                contact_name = 'Unknown Client'
                                client_id = reservation.get('client_id')
                                if client_id:
                                    try:
                                        client_result = supabase.table('clients').select('first_name, last_name').eq('id', client_id).execute()
                                        if client_result.data:
                                            client = client_result.data[0]
                                            contact_name = f"{client.get('first_name', '')} {client.get('last_name', '')}".strip()
                                    except Exception as e:
                                        print(f"Error fetching client name: {e}")
                                
                                res_id = reservation.get('reservation_id', reservation.get('id'))
                                
                                print(f"❌ CONFLICT DETECTED!")
                                print(f"   Reservation: {service_type.upper()} ({res_id}) - {contact_name}")
                                print(f"   Time: {res_start} - {res_end_dt.strftime('%H:%M')}")
                                print(f"   Event: {start_time} - {event_end_dt.strftime('%H:%M')}")
                                
                                return jsonify({
                                    'success': False,
                                    'error': 'SCHEDULE CONFLICT DETECTED',
                                    'conflict': {
                                        'message': f'May naka-reserve na {service_type.upper()} service sa {res_start} - {res_end_dt.strftime("%H:%M")}',
                                        'reservation_id': res_id,
                                        'service_type': service_type.upper(),
                                        'contact_name': contact_name,
                                        'time_range': f'{res_start} - {res_end_dt.strftime("%H:%M")}',
                                        'suggestion': 'Please choose a different time slot or date.'
                                    }
                                }), 409  # 409 Conflict status code
        
        print("✅ No conflicts found, proceeding with event creation")
        
        # Get secretary information from session
        secretary_info = {
            'full_name': session.get('full_name', 'System'),
            'email': session.get('email', '')
        }
        print(f"Secretary creating event: {secretary_info['full_name']} ({secretary_info['email']})")
        
        # Prepare event data
        event_data = {
            'event_name': data['event_name'],
            'event_type': data['event_type'],
            'description': data.get('description', ''),
            'event_date': data['event_date'],
            'start_time': data['start_time'],
            'end_time': data.get('end_time'),
            'status': 'confirmed',
            'created_by': user_id,
            'created_by_secretary': secretary_info['full_name'],
            'created_by_email': secretary_info['email']
        }
        
        # Only add assigned_priest if it's provided and not empty
        if data.get('assigned_priest') and data.get('assigned_priest') != '':
            priest_id = data.get('assigned_priest')
            
            # Verify priest exists in priests table
            priest_check = supabase.table('priests').select('id, first_name, last_name').eq('id', priest_id).execute()
            
            print(f"Priest verification for ID {priest_id}: {priest_check.data}")
            
            if priest_check.data:
                # Store priest ID - will work once database foreign key is fixed
                event_data['assigned_priest'] = priest_id
                priest_name = f"{priest_check.data[0].get('first_name', '')} {priest_check.data[0].get('last_name', '')}"
                print(f"Priest {priest_id} verified and assigned (name: {priest_name})")
            else:
                print(f"Warning: Priest {priest_id} not found in priests table, creating event without priest assignment")
                # Continue without priest assignment rather than failing
        
        print(f"Prepared event data: {event_data}")
        
        # Insert event into database
        print("Inserting event into database...")
        result = supabase.table('events').insert(event_data).execute()
        
        print(f"Insert result: {result}")
        print(f"Insert result data: {result.data}")
        
        if result.data:
            print("Event created successfully!")
            
            # Send email notification to Father Antonio Rodriguez
            try:
                # Get priest information (we know there's only one priest)
                priest_result = supabase.table('priests').select('*').limit(1).execute()
                
                if priest_result.data:
                    priest = priest_result.data[0]
                    priest_name = f"{priest.get('title', 'Father')} {priest.get('first_name', '')} {priest.get('last_name', '')}".strip()
                    priest_email = priest.get('email', 'rotchercadorna16@gmail.com')  # Fallback email
                    
                    print(f"Sending event notification to {priest_name} ({priest_email})")
                    
                    # Send email notification
                    email_sent = send_event_notification_email(
                        priest_email=priest_email,
                        priest_name=priest_name,
                        event_data=result.data[0]
                    )
                    
                    if email_sent:
                        print("✅ Event notification email sent successfully")
                    else:
                        print("❌ Failed to send event notification email")
                else:
                    print("⚠️ No priest found in database, skipping email notification")
                    
            except Exception as email_error:
                print(f"❌ Error sending event notification email: {email_error}")
                # Don't fail the event creation if email fails
            
            return jsonify({
                'success': True,
                'data': result.data[0],
                'message': 'Event created successfully'
            })
        else:
            print("No data returned from insert operation")
            return jsonify({
                'success': False,
                'error': 'Failed to create event - no data returned'
            }), 500
            
    except Exception as e:
        print(f"Error creating event: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an existing event"""
    try:
        data = request.get_json()
        print(f"Updating event {event_id} with data: {data}")
        
        # Prepare update data - match the field names from the frontend
        update_data = {}
        if 'event_name' in data:
            update_data['event_name'] = data['event_name']
        if 'event_type' in data:
            update_data['event_type'] = data['event_type']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'event_date' in data:
            update_data['event_date'] = data['event_date']
        if 'start_time' in data:
            update_data['start_time'] = data['start_time']
        if 'end_time' in data:
            update_data['end_time'] = data['end_time']
        if 'location' in data:
            update_data['location'] = data['location']
        if 'organizer' in data:
            update_data['organizer'] = data['organizer']
        if 'status' in data:
            update_data['status'] = data['status']
        
        # Add updated timestamp
        update_data['updated_at'] = datetime.now().isoformat()
        
        print(f"Prepared update data: {update_data}")
        
        # Update event in database
        result = supabase.table('events').update(update_data).eq('id', event_id).execute()
        
        print(f"Update result: {result}")
        
        if result.data:
            return jsonify({
                'success': True,
                'data': result.data[0],
                'message': 'Event updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Event not found or failed to update'
            }), 404
            
    except Exception as e:
        print(f"Error updating event: {e}")
        print(f"Error traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Failed to update event: {str(e)}'
        }), 500

# @app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event"""
    try:
        result = supabase.table('events').delete().eq('id', event_id).execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'message': 'Event deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Event not found'
            }), 404
            
    except Exception as e:
        print(f"Error deleting event: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to delete event: {str(e)}'
        }), 500

# Priest API Endpoints
@app.route('/api/priests', methods=['GET'])
def get_priests():
    """Get all active priests"""
    try:
        priests = get_all_priests()
        return jsonify({
            'success': True,
            'data': priests
        })
    except Exception as e:
        print(f"Error getting priests: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch priests'
        }), 500

@app.route('/api/reservations/<reservation_id>/assign-priest', methods=['POST'])
def assign_priest_to_reservation(reservation_id):
    """Assign a priest to a reservation and send notification email"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        priest_id = data.get('priest_id')
        
        if not priest_id:
            return jsonify({'error': 'Priest ID is required'}), 400
        
        # Get priest information
        priest = get_priest_by_id(priest_id)
        if not priest:
            return jsonify({'error': 'Priest not found'}), 404
        
        # Update reservation with priest assignment and change status to waiting_priest_approval
        update_data = {
            'priest_id': priest_id,
            'status': 'waiting_priest_approval',
            'updated_at': datetime.now().isoformat()
        }
        
        # Update in main reservations table
        result = supabase.table('reservations').update(update_data).eq('id', reservation_id).execute()
        
        if not result.data:
            # Try with reservation_id field
            result = supabase.table('reservations').update(update_data).eq('reservation_id', reservation_id).execute()
        
        if result.data:
            # Get reservation details for email
            reservation = result.data[0]
            
            # Get client information
            client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
            client = client_result.data[0] if client_result.data else {}
            
            # Prepare email data
            email_data = {
                'service_type': reservation['service_type'],
                'date': reservation['reservation_date'],
                'time': reservation['reservation_time'],
                'client_name': f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                'client_phone': client.get('phone', ''),
                'special_requests': reservation.get('special_requests', '')
            }
            
            # Get current secretary information from session
            secretary_info = {
                'full_name': session.get('full_name', 'Church Secretary'),
                'username': session.get('username', 'secretary'),
                'email': session.get('email', 'secretary@churchease.com'),
                'user_id': session.get('user_id')
            }
            
            # Send email notification to priest
            priest_name = f"{priest['first_name']} {priest['last_name']}"
            # Ensure we have the reservation UUID for link generation
            reservation_uuid = reservation.get('id') or reservation_id
            email_sent = send_priest_notification_email(
                priest['email'],
                priest_name,
                email_data,
                reservation_uuid,
                priest_id,
                secretary_info
            )
            
            return jsonify({
                'success': True,
                'message': f'Priest assigned successfully. Email notification sent: {email_sent}',
                'data': result.data[0]
            })
        else:
            return jsonify({'error': 'Reservation not found'}), 404
            
    except Exception as e:
        print(f"Error assigning priest: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to assign priest: {str(e)}'
        }), 500

# Public link endpoint for priest email actions
@app.route('/api/reservations/<reservation_uuid>/priest-response', methods=['GET', 'POST'])
def priest_response_via_email(reservation_uuid):
    """Process priest approval/decline from email link using signed token."""
    try:
        action = request.args.get('action')  # 'approve' or 'decline'
        token = request.args.get('token')
        if action not in ['approve', 'decline'] or not token:
            return ("<h3>Invalid request.</h3>", 400)

        # Validate token (valid for 7 days)
        s = _get_serializer()
        try:
            data = s.loads(token, max_age=7*24*3600)
        except SignatureExpired:
            return ("<h3>Link expired. Please ask the secretary to resend.</h3>", 400)
        except BadSignature:
            return ("<h3>Invalid or tampered link.</h3>", 400)

        token_reservation = data.get('r')
        token_priest = data.get('p')
        token_action = data.get('a')

        if token_action != action:
            return ("<h3>Action mismatch.</h3>", 400)
        if token_reservation != reservation_uuid:
            return ("<h3>Reservation mismatch.</h3>", 400)

        # Load reservation; support both UUID (id) and code (reservation_id)
        result = supabase.table('reservations').select('*').eq('id', reservation_uuid).limit(1).execute()
        if not result.data:
            result = supabase.table('reservations').select('*').eq('reservation_id', reservation_uuid).limit(1).execute()
        if not result.data:
            return ("<h3>Reservation not found.</h3>", 404)

        reservation = result.data[0]
        # Verify the priest matches
        if reservation.get('priest_id') != token_priest:
            return ("<h3>You are not the assigned priest for this reservation.</h3>", 403)

        # If declining and no reason provided yet, show decline reason form
        if action == 'decline' and request.method == 'GET':
            decline_reason = request.args.get('reason', '')
            if not decline_reason:
                # Show decline reason form
                return render_decline_reason_form(reservation, reservation_uuid, token)
        
        # Get decline reason from form or query param
        decline_reason = request.form.get('decline_reason') or request.args.get('reason', '')
        
        new_status = 'approved' if action == 'approve' else 'declined'
        priest_response = f'Email response: {new_status}'
        if action == 'decline' and decline_reason:
            priest_response = f'Declined: {decline_reason}'
        
        update = {
            'status': new_status,
            'priest_response': priest_response,
            'updated_at': datetime.now().isoformat()
        }
        upd = supabase.table('reservations').update(update).eq('id', reservation['id']).execute()
        if not upd.data:
            return ("<h3>Failed to update reservation.</h3>", 500)

        # If priest declined, send notification to client
        if action == 'decline':
            try:
                # Get client information
                print(f"Looking for client with ID: {reservation['client_id']}")
                client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
                if client_result.data:
                    client = client_result.data[0]
                    print(f"Found client data: {client}")
                    client_email = client.get('email')
                    # Construct full name from first_name and last_name
                    first_name = client.get('first_name', '')
                    last_name = client.get('last_name', '')
                    client_name = f"{first_name} {last_name}".strip() or 'Valued Client'
                    print(f"Client email: {client_email}, Client name: {client_name}")
                    
                    if client_email:
                        # Prepare reservation data for email
                        reservation_data = {
                            'service_type': reservation.get('service_type', ''),
                            'date': reservation.get('reservation_date', ''),
                            'time': reservation.get('time_slot', '')
                        }
                        
                        # Send decline notification to client
                        email_sent = send_client_decline_notification(client_email, client_name, reservation_data)
                        print(f"Client notification sent: {email_sent}")
                    else:
                        print("No client email found for decline notification")
                else:
                    print("Client not found for decline notification")
            except Exception as email_error:
                print(f"Error sending client decline notification: {email_error}")

        # Enhanced confirmation page with beautiful design
        status_color = '#10b981' if action == 'approve' else '#ef4444'
        status_bg = '#ecfdf5' if action == 'approve' else '#fef2f2'
        status_icon = '✅' if action == 'approve' else '❌'
        status_message = 'APPROVED' if action == 'approve' else 'DECLINED'
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ChurchEase - Response Recorded</title>
            <style>
                @keyframes fadeIn {{
                    from {{ opacity: 0; transform: translateY(20px); }}
                    to {{ opacity: 1; transform: translateY(0); }}
                }}
                @keyframes checkmark {{
                    0% {{ transform: scale(0); }}
                    50% {{ transform: scale(1.2); }}
                    100% {{ transform: scale(1); }}
                }}
                .animate-in {{ animation: fadeIn 0.6s ease-out; }}
                .animate-check {{ animation: checkmark 0.5s ease-out 0.3s both; }}
            </style>
        </head>
        <body style='margin:0;padding:0;background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;'>
            <div class="animate-in" style='max-width:500px;margin:20px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.1);text-align:center;'>
                <!-- Header -->
                <div style='background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#6366f1 100%);color:#ffffff;padding:32px 24px;position:relative;'>
                    <div style='position:absolute;top:0;left:0;right:0;bottom:0;background:url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");opacity:0.3;'></div>
                    <div style='position:relative;z-index:1;'>
                        <h1 style='margin:0;font-size:24px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.1);'>⛪ ChurchEase</h1>
                        <p style='margin:8px 0 0 0;font-size:14px;opacity:0.9;'>Church Reservation Management</p>
                    </div>
                </div>
                
                <!-- Content -->
                <div style='padding:48px 32px;'>
                    <!-- Status Icon -->
                    <div class="animate-check" style='width:80px;height:80px;background:{status_color};border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(16,185,129,0.3);'>
                        <span style='font-size:36px;color:#ffffff;'>{status_icon}</span>
                    </div>
                    
                    <!-- Thank You Message -->
                    <h2 style='color:#1f2937;margin:0 0 16px 0;font-size:28px;font-weight:700;'>Response Recorded Successfully</h2>
                    
                    <!-- Status Message -->
                    <div style='background:{status_bg};border:2px solid {status_color};border-radius:12px;padding:20px;margin:24px 0;'>
                        <p style='color:{status_color};margin:0;font-size:18px;font-weight:600;'>
                            Reservation Status: <strong>{status_message}</strong>
                        </p>
                    </div>
                    
                    <!-- Additional Info -->
                    {f'<div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:12px;padding:16px;margin:20px 0;"><p style="color:#0369a1;margin:0;font-size:14px;font-weight:500;line-height:1.6;"><span style="font-size:16px;margin-right:8px;">📧</span>The client has been automatically notified via email regarding the decline of their reservation request.</p></div>' if action == 'decline' else '<div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:12px;padding:16px;margin:20px 0;"><p style="color:#15803d;margin:0;font-size:14px;font-weight:500;line-height:1.6;"><span style="font-size:16px;margin-right:8px;">📅</span>The reservation has been approved and successfully added to the church calendar.</p></div>'}
                    
                    <!-- Close Instructions -->
                    <div style='margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;'>
                        <p style='color:#6b7280;margin:0;font-size:14px;line-height:1.6;'>This window may now be closed.</p>
                        <p style='color:#9ca3af;margin:8px 0 0 0;font-size:12px;line-height:1.6;'>Thank you for your dedicated service to Saint Andrew the Apostle Parish.</p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style='background:#f8fafc;padding:16px;border-top:1px solid #e5e7eb;'>
                    <p style='color:#9ca3af;font-size:12px;margin:0;'>— ChurchEase Reservation Management System</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
    except Exception as e:
        print(f"Error in priest_response_via_email: {e}")
        return ("<h3>Server error.</h3>", 500)

@app.route('/api/reservations/<reservation_id>/priest-response', methods=['POST'])
def priest_response_to_reservation(reservation_id):
    """Handle priest approval or decline response"""
    try:
        data = request.get_json()
        response = data.get('response')  # 'approved' or 'declined'
        priest_response = data.get('message', '')
        
        if response not in ['approved', 'declined']:
            return jsonify({'error': 'Invalid response. Must be approved or declined'}), 400
        
        # Update reservation status
        update_data = {
            'status': response,
            'priest_response': priest_response,
            'updated_at': datetime.now().isoformat()
        }
        
        # Update in main reservations table
        result = supabase.table('reservations').update(update_data).eq('id', reservation_id).execute()
        
        if not result.data:
            # Try with reservation_id field
            result = supabase.table('reservations').update(update_data).eq('reservation_id', reservation_id).execute()
        
        if result.data:
            # If priest declined, send notification to client
            if response == 'declined':
                try:
                    reservation = result.data[0]
                    # Get client information
                    print(f"Looking for client with ID: {reservation['client_id']}")
                    client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
                    if client_result.data:
                        client = client_result.data[0]
                        print(f"Found client data: {client}")
                        client_email = client.get('email')
                        # Construct full name from first_name and last_name
                        first_name = client.get('first_name', '')
                        last_name = client.get('last_name', '')
                        client_name = f"{first_name} {last_name}".strip() or 'Valued Client'
                        print(f"Client email: {client_email}, Client name: {client_name}")
                        
                        if client_email:
                            # Prepare reservation data for email
                            reservation_data = {
                                'service_type': reservation.get('service_type', ''),
                                'date': reservation.get('reservation_date', ''),
                                'time': reservation.get('time_slot', '')
                            }
                            
                            # Send decline notification to client
                            email_sent = send_client_decline_notification(client_email, client_name, reservation_data)
                            print(f"Client notification sent: {email_sent}")
                        else:
                            print("No client email found for decline notification")
                    else:
                        print("Client not found for decline notification")
                except Exception as email_error:
                    print(f"Error sending client decline notification: {email_error}")
            
            return jsonify({
                'success': True,
                'message': f'Reservation {response} successfully',
                'data': result.data[0]
            })
        else:
            return jsonify({'error': 'Reservation not found'}), 404
            
    except Exception as e:
        print(f"Error processing priest response: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to process response: {str(e)}'
        }), 500

@app.route('/api/reservations/<reservation_id>/reassign-priest', methods=['POST'])
def reassign_priest_to_reservation(reservation_id):
    """Reassign a new priest to a declined reservation"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        new_priest_id = data.get('priest_id')
        
        if not new_priest_id:
            return jsonify({'error': 'New priest ID is required'}), 400
        
        # Get new priest information
        new_priest = get_priest_by_id(new_priest_id)
        if not new_priest:
            return jsonify({'error': 'New priest not found'}), 404
        
        # Get current reservation details
        reservation_result = supabase.table('reservations').select('*').eq('id', reservation_id).execute()
        if not reservation_result.data:
            reservation_result = supabase.table('reservations').select('*').eq('reservation_id', reservation_id).execute()
        
        if not reservation_result.data:
            return jsonify({'error': 'Reservation not found'}), 404
        
        reservation = reservation_result.data[0]
        
        # Update reservation with new priest and reset status to waiting_priest_approval
        update_data = {
            'priest_id': new_priest_id,
            'status': 'waiting_priest_approval',
            'priest_response': None,  # Clear previous response
            'updated_at': datetime.now().isoformat()
        }
        
        # Update in main reservations table
        result = supabase.table('reservations').update(update_data).eq('id', reservation['id']).execute()
        
        if result.data:
            # Get client information for email
            client_result = supabase.table('clients').select('*').eq('id', reservation['client_id']).execute()
            client = client_result.data[0] if client_result.data else {}
            
            # Prepare email data
            email_data = {
                'service_type': reservation['service_type'],
                'date': reservation['reservation_date'],
                'time': reservation['reservation_time'],
                'client_name': f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                'client_phone': client.get('phone', ''),
                'special_requests': reservation.get('special_requests', '')
            }
            
            # Get current secretary information from session
            secretary_info = {
                'full_name': session.get('full_name', 'Church Secretary'),
                'username': session.get('username', 'secretary'),
                'email': session.get('email', 'secretary@churchease.com'),
                'user_id': session.get('user_id')
            }
            
            # Send email notification to new priest
            priest_name = f"{new_priest['first_name']} {new_priest['last_name']}"
            email_sent = send_priest_notification_email(
                new_priest['email'], 
                priest_name, 
                email_data, 
                reservation.get('id') or reservation_id,
                new_priest['id'],
                secretary_info
            )
            
            return jsonify({
                'success': True,
                'message': f'Priest reassigned successfully to {priest_name}. Email notification sent: {email_sent}',
                'data': result.data[0]
            })
        else:
            return jsonify({'error': 'Failed to reassign priest'}), 500
            
    except Exception as e:
        print(f"Error reassigning priest: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to reassign priest: {str(e)}'
        }), 500

# Priest Management CRUD API Endpoints
@app.route('/api/priests/all', methods=['GET'])
def get_all_priests_for_management():
    """Get all priests (including inactive) for management purposes"""
    try:
        result = supabase.table('priests').select('*').order('created_at', desc=True).execute()
        
        # Format the data for the frontend
        priests_data = []
        for priest in result.data:
            # Combine first_name and last_name to create full_name
            first_name = priest.get('first_name', '')
            last_name = priest.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            
            priests_data.append({
                'id': priest.get('id'),
                'full_name': full_name,
                'first_name': first_name,
                'last_name': last_name,
                'email': priest.get('email'),
                'phone': priest.get('phone'),
                'specialization': priest.get('specialization'),
                'status': priest.get('status', 'active'),
                'created_at': priest.get('created_at'),
                'updated_at': priest.get('updated_at')
            })
        
        return jsonify({
            'success': True,
            'data': priests_data,
            'count': len(priests_data)
        })
    except Exception as e:
        print(f"Error getting all priests for management: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch priests'
        }), 500

@app.route('/api/priests', methods=['POST'])
def create_priest():
    """Create a new priest"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'specialization']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        # Check if email already exists
        existing_priest = supabase.table('priests').select('*').eq('email', data['email']).execute()
        if existing_priest.data:
            return jsonify({
                'success': False,
                'error': 'A priest with this email already exists'
            }), 400
        
        # Split full_name into first_name and last_name
        full_name = data['full_name'].strip()
        name_parts = full_name.split(' ', 1)  # Split into max 2 parts
        first_name = name_parts[0] if name_parts else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Prepare priest data
        priest_data = {
            'id': str(uuid.uuid4()),
            'first_name': first_name,
            'last_name': last_name,
            'email': data['email'],
            'phone': data.get('phone', ''),
            'specialization': data['specialization'],
            'status': data.get('status', 'active'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Insert into database
        result = supabase.table('priests').insert(priest_data).execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'message': 'Priest created successfully',
                'data': result.data[0]
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create priest'
            }), 500
            
    except Exception as e:
        print(f"Error creating priest: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to create priest: {str(e)}'
        }), 500

@app.route('/api/priests/<priest_id>', methods=['GET'])
def get_priest_details(priest_id):
    """Get details for a specific priest"""
    try:
        result = supabase.table('priests').select('*').eq('id', priest_id).execute()
        
        if result.data:
            priest = result.data[0]
            # Combine first_name and last_name to create full_name
            first_name = priest.get('first_name', '')
            last_name = priest.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip()
            
            # Add full_name to the priest data
            priest['full_name'] = full_name
            
            return jsonify({
                'success': True,
                'data': priest
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Priest not found'
            }), 404
            
    except Exception as e:
        print(f"Error getting priest details: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch priest details'
        }), 500

@app.route('/api/priests/<priest_id>', methods=['PUT'])
def update_priest(priest_id):
    """Update an existing priest"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'specialization']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        # Check if priest exists
        existing_priest = supabase.table('priests').select('*').eq('id', priest_id).execute()
        if not existing_priest.data:
            return jsonify({
                'success': False,
                'error': 'Priest not found'
            }), 404
        
        # Check if email is being changed and if it already exists for another priest
        if data['email'] != existing_priest.data[0]['email']:
            email_check = supabase.table('priests').select('*').eq('email', data['email']).neq('id', priest_id).execute()
            if email_check.data:
                return jsonify({
                    'success': False,
                    'error': 'A priest with this email already exists'
                }), 400
        
        # Split full_name into first_name and last_name
        full_name = data['full_name'].strip()
        name_parts = full_name.split(' ', 1)  # Split into max 2 parts
        first_name = name_parts[0] if name_parts else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Prepare update data
        update_data = {
            'first_name': first_name,
            'last_name': last_name,
            'email': data['email'],
            'phone': data.get('phone', ''),
            'specialization': data['specialization'],
            'status': data.get('status', 'active'),
            'updated_at': datetime.now().isoformat()
        }
        
        # Update in database
        result = supabase.table('priests').update(update_data).eq('id', priest_id).execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'message': 'Priest updated successfully',
                'data': result.data[0]
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update priest'
            }), 500
            
    except Exception as e:
        print(f"Error updating priest: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to update priest: {str(e)}'
        }), 500

@app.route('/api/priests/<priest_id>', methods=['DELETE'])
def delete_priest(priest_id):
    """Delete a priest (soft delete by setting status to inactive)"""
    try:
        # Check if priest exists
        existing_priest = supabase.table('priests').select('*').eq('id', priest_id).execute()
        if not existing_priest.data:
            return jsonify({
                'success': False,
                'error': 'Priest not found'
            }), 404
        
        # Check if priest has active reservations
        active_reservations = supabase.table('reservations').select('*').eq('priest_id', priest_id).in_('status', ['pending', 'waiting_priest_approval', 'approved']).execute()
        
        if active_reservations.data:
            return jsonify({
                'success': False,
                'error': f'Cannot delete priest. They have {len(active_reservations.data)} active reservations. Please reassign these reservations first.'
            }), 400
        
        # Soft delete by setting status to inactive
        result = supabase.table('priests').update({
            'status': 'inactive',
            'updated_at': datetime.now().isoformat()
        }).eq('id', priest_id).execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'message': 'Priest removed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to remove priest'
            }), 500
            
    except Exception as e:
        print(f"Error deleting priest: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to remove priest: {str(e)}'
        }), 500

# Reports API Endpoints
@app.route('/api/reports/summary', methods=['GET'])
def get_reports_summary():
    """Get summary statistics for reports dashboard"""
    try:
        # Get total reservations
        reservations_response = supabase.table('reservations').select('*').execute()
        total_reservations = len(reservations_response.data) if reservations_response.data else 0
        
        # Get pending approvals count - check multiple possible status values
        pending_response = supabase.table('reservations').select('*').eq('status', 'pending').execute()
        pending_approvals = len(pending_response.data) if pending_response.data else 0
        
        # Debug: Check all status values in database
        all_statuses = supabase.table('reservations').select('status').execute()
        print(f"DEBUG - All reservation statuses in DB: {[r.get('status') for r in all_statuses.data] if all_statuses.data else []}")
        print(f"DEBUG - Pending count: {pending_approvals}")
        
        # Also check for 'waiting_priest_approval' status
        waiting_response = supabase.table('reservations').select('*').eq('status', 'waiting_priest_approval').execute()
        waiting_count = len(waiting_response.data) if waiting_response.data else 0
        print(f"DEBUG - Waiting priest approval count: {waiting_count}")
        
        # Total pending = pending + waiting_priest_approval
        total_pending = pending_approvals + waiting_count
        
        # Get total stipendium from payments
        payments_response = supabase.table('payments').select('amount_paid').execute()
        total_stipendium = 0
        if payments_response.data:
            for payment in payments_response.data:
                if payment.get('amount_paid'):
                    total_stipendium += float(payment['amount_paid'])
        
        # Calculate monthly growth (compare with previous month)
        from datetime import datetime, timedelta
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Get current month reservations
        current_month_start = f"{current_year}-{current_month:02d}-01"
        if current_month == 12:
            next_month_start = f"{current_year + 1}-01-01"
        else:
            next_month_start = f"{current_year}-{current_month + 1:02d}-01"
            
        current_month_reservations = supabase.table('reservations').select('*').gte('created_at', current_month_start).lt('created_at', next_month_start).execute()
        current_month_count = len(current_month_reservations.data) if current_month_reservations.data else 0
        
        # Get previous month reservations
        if current_month == 1:
            prev_month = 12
            prev_year = current_year - 1
        else:
            prev_month = current_month - 1
            prev_year = current_year
            
        prev_month_start = f"{prev_year}-{prev_month:02d}-01"
        if prev_month == 12:
            prev_month_end = f"{prev_year + 1}-01-01"
        else:
            prev_month_end = f"{prev_year}-{prev_month + 1:02d}-01"
            
        prev_month_reservations = supabase.table('reservations').select('*').gte('created_at', prev_month_start).lt('created_at', prev_month_end).execute()
        prev_month_count = len(prev_month_reservations.data) if prev_month_reservations.data else 0
        
        # Calculate growth percentage
        if prev_month_count > 0:
            reservation_growth = round(((current_month_count - prev_month_count) / prev_month_count) * 100, 1)
        else:
            reservation_growth = 0 if current_month_count == 0 else 100
            
        return jsonify({
            'success': True,
            'data': {
                'total_reservations': total_reservations,
                'total_revenue': total_stipendium,
                'pending_approvals': total_pending,
                'reservation_growth': reservation_growth,
                'current_month_reservations': current_month_count,
                'prev_month_reservations': prev_month_count
            }
        })
        
    except Exception as e:
        print(f"Error getting reports summary: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch reports summary: {str(e)}'
        }), 500

@app.route('/api/reports/monthly-reservations', methods=['GET'])
def get_monthly_reservations():
    """Get monthly APPROVED reservation counts for the current year"""
    try:
        current_year = datetime.now().year
        monthly_data = []
        
        for month in range(1, 13):
            month_start = f"{current_year}-{month:02d}-01"
            if month == 12:
                month_end = f"{current_year + 1}-01-01"
            else:
                month_end = f"{current_year}-{month + 1:02d}-01"
                
            # Filter for APPROVED reservations only (priest-approved)
            month_reservations = supabase.table('reservations')\
                .select('*')\
                .gte('created_at', month_start)\
                .lt('created_at', month_end)\
                .in_('status', ['approved', 'confirmed', 'completed'])\
                .execute()
            count = len(month_reservations.data) if month_reservations.data else 0
            monthly_data.append(count)
            
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                'counts': monthly_data
            }
        })
        
    except Exception as e:
        print(f"Error getting monthly reservations: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch monthly reservations: {str(e)}'
        }), 500

@app.route('/api/reports/service-distribution', methods=['GET'])
def get_service_distribution():
    """Get service type distribution"""
    try:
        reservations_response = supabase.table('reservations').select('service_type').execute()
        
        service_counts = {
            'wedding': 0,
            'baptism': 0,
            'funeral': 0,
            'confirmation': 0
        }
        
        if reservations_response.data:
            for reservation in reservations_response.data:
                service_type = reservation.get('service_type', '').lower()
                if service_type in service_counts:
                    service_counts[service_type] += 1
                    
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Wedding', 'Baptism', 'Funeral', 'Confirmation'],
                'counts': [
                    service_counts['wedding'],
                    service_counts['baptism'],
                    service_counts['funeral'],
                    service_counts['confirmation']
                ]
            }
        })
        
    except Exception as e:
        print(f"Error getting service distribution: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch service distribution: {str(e)}'
        }), 500

@app.route('/api/reports/revenue-trends', methods=['GET'])
def get_revenue_trends():
    """Get monthly stipendium trends for the last 6 months"""
    try:
        from datetime import datetime, timedelta
        
        current_date = datetime.now()
        monthly_stipendium = []
        month_labels = []
        
        for i in range(5, -1, -1):  # Last 6 months
            target_date = current_date - timedelta(days=i*30)  # Approximate month calculation
            month_start = target_date.replace(day=1)
            
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1, day=1)
                
            # Get payments for this month
            payments_response = supabase.table('payments').select('amount_paid, created_at').gte('created_at', month_start.isoformat()).lt('created_at', month_end.isoformat()).execute()
            
            month_stipendium = 0
            if payments_response.data:
                for payment in payments_response.data:
                    if payment.get('amount_paid'):
                        month_stipendium += float(payment['amount_paid'])
                        
            monthly_stipendium.append(month_stipendium)
            month_labels.append(month_start.strftime('%b'))
            
        return jsonify({
            'success': True,
            'data': {
                'labels': month_labels,
                'revenue': monthly_stipendium
            }
        })
        
    except Exception as e:
        print(f"Error getting revenue trends: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch revenue trends: {str(e)}'
        }), 500

@app.route('/api/reports/payment-status', methods=['GET'])
def get_payment_status_distribution():
    """Get payment status distribution"""
    try:
        # Get all reservations with their payment info
        reservations_response = supabase.table('reservations').select('id, service_type').execute()
        print(f"DEBUG - Total reservations found: {len(reservations_response.data) if reservations_response.data else 0}")
        
        payment_counts = {
            'fully_paid': 0,
            'partial_payment': 0,
            'pending_payment': 0,
            'no_payment_required': 0
        }
        
        if reservations_response.data:
            for reservation in reservations_response.data:
                reservation_id = reservation.get('id')
                service_type = reservation.get('service_type', '').lower()
                print(f"DEBUG - Processing reservation {reservation_id}, service: {service_type}")
                
                # Check if service requires payment - but let's check actual payment data first
                # Don't automatically assume confirmation = no payment, check the actual data
                
                # Get payment info for this reservation
                payment_response = supabase.table('payments').select('payment_status, amount_paid, amount_due, payment_type').eq('reservation_id', reservation_id).execute()
                print(f"DEBUG - Payment data for {reservation_id}: {payment_response.data}")
                
                if payment_response.data and len(payment_response.data) > 0:
                    payment = payment_response.data[0]
                    payment_status = payment.get('payment_status', '').lower()
                    payment_type = payment.get('payment_type', '').lower()
                    amount_paid = float(payment.get('amount_paid', 0)) if payment.get('amount_paid') else 0
                    amount_due = float(payment.get('amount_due', 0)) if payment.get('amount_due') else 0
                    
                    print(f"DEBUG - Payment status: {payment_status}, type: {payment_type}, paid: {amount_paid}, due: {amount_due}")
                    
                    # Check if this is a confirmation service with no payment required
                    if service_type == 'confirmation' and amount_due == 0 and amount_paid == 0:
                        payment_counts['no_payment_required'] += 1
                        print(f"DEBUG - Confirmation service with no payment required")
                    elif payment_status == 'paid' or payment_type == 'full':
                        payment_counts['fully_paid'] += 1
                        print(f"DEBUG - Classified as fully paid")
                    elif payment_status == 'partial' or payment_type == 'partial':
                        payment_counts['partial_payment'] += 1
                        print(f"DEBUG - Classified as partial payment")
                    elif payment_status == 'pending' or amount_paid == 0:
                        payment_counts['pending_payment'] += 1
                        print(f"DEBUG - Classified as pending payment")
                    else:
                        payment_counts['pending_payment'] += 1
                        print(f"DEBUG - Classified as pending payment (default)")
                else:
                    payment_counts['pending_payment'] += 1
                    print(f"DEBUG - No payment data found, classified as pending")
        
        print(f"DEBUG - Final payment counts: {payment_counts}")
        total_count = sum(payment_counts.values())
        print(f"DEBUG - Total processed: {total_count}")
                    
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Fully Paid', 'Partial Payment', 'Pending Payment', 'No Payment Required'],
                'counts': [
                    payment_counts['fully_paid'],
                    payment_counts['partial_payment'],
                    payment_counts['pending_payment'],
                    payment_counts['no_payment_required']
                ]
            }
        })
        
    except Exception as e:
        print(f"Error getting payment status distribution: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch payment status distribution: {str(e)}'
        }), 500

# Database setup endpoint
# @app.route('/api/setup-events-table', methods=['POST'])
def setup_events_table():
    """Create events table if it doesn't exist"""
    try:
        # SQL to create events table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL CHECK (type IN ('worship', 'prayer', 'bible_study', 'youth', 'outreach', 'fellowship', 'special', 'meeting', 'other')),
            description TEXT,
            event_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME,
            location VARCHAR(255),
            organizer VARCHAR(255),
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
            created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
        CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
        CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
        
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER IF NOT EXISTS update_events_updated_at
            BEFORE UPDATE ON events
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
        
        # Execute the SQL using Supabase RPC or direct SQL execution
        # Note: This is a simplified approach - in production you'd use proper migrations
        result = supabase.rpc('exec_sql', {'sql': create_table_sql}).execute()
        
        return jsonify({
            'success': True,
            'message': 'Events table created successfully'
        })
        
    except Exception as e:
        print(f"Error creating events table: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to create events table: {str(e)}'
        }), 500

# User Management API Endpoints for Admin Dashboard

@app.route('/api/users', methods=['GET'])
def get_all_users():
    """Get all users for admin dashboard"""
    try:
        result = supabase.table('users').select('*').order('created_at', desc=True).execute()
        
        users = []
        for user in result.data:
            users.append({
                'id': user['id'],
                'full_name': user.get('full_name', user['username']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'status': 'active',  # You can add status field to database later
                'created_at': user.get('created_at', ''),
                'last_login': user.get('last_login', None)
            })
        
        return jsonify({
            'success': True,
            'users': users
        })
        
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch users: {str(e)}'
        }), 500

@app.route('/api/users', methods=['POST'])
def create_new_user():
    """Create a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Check if username or email already exists
        try:
            # Check username
            username_check = supabase.table('users').select('*').eq('username', data['username']).execute()
            if username_check.data:
                return jsonify({
                    'success': False,
                    'error': 'Username already exists'
                }), 400
            
            # Check email
            email_check = supabase.table('users').select('*').eq('email', data['email']).execute()
            if email_check.data:
                return jsonify({
                    'success': False,
                    'error': 'Email already exists'
                }), 400
        except Exception as check_error:
            print(f"Error checking duplicates: {check_error}")
            # Continue with creation if duplicate check fails
        
        # Validate email format
        import re
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, data['email']):
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400
        
        # Validate password strength
        if len(data['password']) < 6:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 6 characters long'
            }), 400
        
        # Create new user
        user_data = {
            'id': str(uuid.uuid4()),
            'username': data['username'].strip(),
            'full_name': data['full_name'].strip(),
            'email': data['email'].strip().lower(),
            'password_hash': generate_password_hash(data['password']),
            'role': data['role'],
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        print(f"Creating new user: {data['username']} ({data['email']}) with role: {data['role']}")
        
        try:
            result = supabase.table('users').insert(user_data).execute()
            print(f"User creation result: {result}")
            
            if result.data:
                created_user = result.data[0]
                print(f"✅ User created successfully: {created_user['username']}")
                
                # AUTO-SYNC: If role is 'priest', automatically add to priests table
                if created_user['role'] == 'priest':
                    try:
                        # Split full name into first and last name
                        name_parts = created_user['full_name'].strip().split(' ', 1)
                        first_name = name_parts[0] if len(name_parts) > 0 else created_user['full_name']
                        last_name = name_parts[1] if len(name_parts) > 1 else ''
                        
                        priest_data = {
                            'id': created_user['id'],  # Use same UUID as user
                            'first_name': first_name,
                            'last_name': last_name,
                            'email': created_user['email'],
                            'phone': '',  # Can be updated later
                            'status': 'active',
                            'specialization': 'General services',  # Default specialization
                            'created_at': datetime.utcnow().isoformat()
                        }
                        
                        priest_result = supabase.table('priests').insert(priest_data).execute()
                        print(f"✅ Priest record created automatically: {first_name} {last_name}")
                    except Exception as priest_error:
                        print(f"⚠️ Warning: Failed to create priest record: {priest_error}")
                        # Don't fail the user creation if priest creation fails
                
                return jsonify({
                    'success': True,
                    'message': 'User created successfully' + (' and added to priests table' if created_user['role'] == 'priest' else ''),
                    'user': {
                        'id': created_user['id'],
                        'full_name': created_user['full_name'],
                        'username': created_user['username'],
                        'email': created_user['email'],
                        'role': created_user['role'],
                        'status': created_user.get('status', 'active'),
                        'created_at': created_user['created_at'],
                        'updated_at': created_user.get('updated_at', '')
                    }
                })
            else:
                print("❌ No data returned from user creation")
                return jsonify({
                    'success': False,
                    'error': 'Failed to create user - no data returned'
                }), 500
        except Exception as insert_error:
            print(f"❌ Database insert error: {insert_error}")
            return jsonify({
                'success': False,
                'error': f'Database error: {str(insert_error)}'
            }), 500
            
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to create user: {str(e)}'
        }), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_by_id(user_id):
    """Get user details by ID"""
    try:
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not result.data:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        user = result.data[0]
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'full_name': user.get('full_name', user['username']),
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'status': user.get('status', 'active'),
                'created_at': user.get('created_at', ''),
                'last_login': user.get('last_login', None)
            }
        })
        
    except Exception as e:
        print(f"Error fetching user: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch user: {str(e)}'
        }), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user details"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'username', 'email', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Check if user exists
        existing_user = supabase.table('users').select('*').eq('id', user_id).execute()
        if not existing_user.data:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        old_user = existing_user.data[0]
        old_role = old_user['role']
        new_role = data['role']
        
        # Check if username or email is taken by another user
        try:
            # Check username
            username_check = supabase.table('users').select('*').neq('id', user_id).eq('username', data['username']).execute()
            if username_check.data:
                return jsonify({
                    'success': False,
                    'error': 'Username already exists'
                }), 400
            
            # Check email
            email_check = supabase.table('users').select('*').neq('id', user_id).eq('email', data['email']).execute()
            if email_check.data:
                return jsonify({
                    'success': False,
                    'error': 'Email already exists'
                }), 400
        except Exception as e:
            print(f"Error checking duplicates: {e}")
            # Continue with update if duplicate check fails
        
        # Update user data
        update_data = {
            'full_name': data['full_name'],
            'username': data['username'],
            'email': data['email'],
            'role': data['role'],
            'status': data.get('status', 'active'),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        try:
            print(f"Updating user {user_id} with data: {update_data}")
            result = supabase.table('users').update(update_data).eq('id', user_id).execute()
            print(f"Update result: {result}")
            
            # AUTO-SYNC: Handle role changes for priest synchronization
            if old_role != new_role:
                # Case 1: Changed FROM priest TO something else - remove from priests table
                if old_role == 'priest' and new_role != 'priest':
                    try:
                        supabase.table('priests').delete().eq('id', user_id).execute()
                        print(f"✅ Removed from priests table (role changed from priest to {new_role})")
                    except Exception as priest_error:
                        print(f"⚠️ Warning: Failed to remove from priests table: {priest_error}")
                
                # Case 2: Changed TO priest FROM something else - add to priests table
                elif old_role != 'priest' and new_role == 'priest':
                    try:
                        # Split full name into first and last name
                        name_parts = data['full_name'].strip().split(' ', 1)
                        first_name = name_parts[0] if len(name_parts) > 0 else data['full_name']
                        last_name = name_parts[1] if len(name_parts) > 1 else ''
                        
                        priest_data = {
                            'id': user_id,
                            'first_name': first_name,
                            'last_name': last_name,
                            'email': data['email'],
                            'phone': '',
                            'status': 'active',
                            'specialization': 'General services',
                            'created_at': datetime.utcnow().isoformat()
                        }
                        
                        supabase.table('priests').insert(priest_data).execute()
                        print(f"✅ Added to priests table (role changed from {old_role} to priest)")
                    except Exception as priest_error:
                        print(f"⚠️ Warning: Failed to add to priests table: {priest_error}")
            
            # If role is still priest, update priest record with new information
            elif new_role == 'priest':
                try:
                    name_parts = data['full_name'].strip().split(' ', 1)
                    first_name = name_parts[0] if len(name_parts) > 0 else data['full_name']
                    last_name = name_parts[1] if len(name_parts) > 1 else ''
                    
                    priest_update = {
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': data['email']
                    }
                    
                    supabase.table('priests').update(priest_update).eq('id', user_id).execute()
                    print(f"✅ Updated priest record with new information")
                except Exception as priest_error:
                    print(f"⚠️ Warning: Failed to update priest record: {priest_error}")
            
            if result.data:
                return jsonify({
                    'success': True,
                    'message': 'User updated successfully',
                    'user': {
                        'id': result.data[0]['id'],
                        'full_name': result.data[0]['full_name'],
                        'username': result.data[0]['username'],
                        'email': result.data[0]['email'],
                        'role': result.data[0]['role'],
                        'status': result.data[0].get('status', 'active'),
                        'created_at': result.data[0].get('created_at', ''),
                        'updated_at': result.data[0].get('updated_at', '')
                    }
                })
            else:
                print("No data returned from update operation")
                return jsonify({
                    'success': False,
                    'error': 'Failed to update user - no data returned'
                }), 500
        except Exception as update_error:
            print(f"Error during update operation: {update_error}")
            return jsonify({
                'success': False,
                'error': f'Database update failed: {str(update_error)}'
            }), 500
            
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to update user: {str(e)}'
        }), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user (with protection for admin users)"""
    try:
        # Check if user exists
        existing_user = supabase.table('users').select('*').eq('id', user_id).execute()
        if not existing_user.data:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        user = existing_user.data[0]
        
        # Protect admin users from deletion
        if user['role'] == 'admin':
            return jsonify({
                'success': False,
                'error': 'Cannot delete admin users'
            }), 403
        
        # AUTO-SYNC: If role is 'priest', automatically delete from priests table first
        if user['role'] == 'priest':
            try:
                priest_delete = supabase.table('priests').delete().eq('id', user_id).execute()
                print(f"✅ Priest record deleted automatically for user: {user['username']}")
            except Exception as priest_error:
                print(f"⚠️ Warning: Failed to delete priest record: {priest_error}")
                # Continue with user deletion even if priest deletion fails
        
        # Delete user
        result = supabase.table('users').delete().eq('id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully' + (' and removed from priests table' if user['role'] == 'priest' else '')
        })
        
    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to delete user: {str(e)}'
        }), 500

@app.route('/api/users/<user_id>/reset-password', methods=['POST'])
def reset_user_password(user_id):
    """Reset user password"""
    try:
        data = request.get_json()
        print(f"Password reset request for user {user_id}: {data}")
        
        # Validate input
        if not data.get('new_password'):
            return jsonify({
                'success': False,
                'error': 'New password is required'
            }), 400
        
        # Validate password strength
        new_password = data['new_password']
        if len(new_password) < 6:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 6 characters long'
            }), 400
        
        # Check if user exists
        existing_user = supabase.table('users').select('*').eq('id', user_id).execute()
        if not existing_user.data:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        user = existing_user.data[0]
        print(f"Resetting password for user: {user.get('username', 'Unknown')}")
        
        # Generate password hash
        password_hash = generate_password_hash(new_password)
        print(f"Generated password hash: {password_hash[:50]}...")
        
        # Update password
        update_data = {
            'password_hash': password_hash,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Note: force_password_change feature removed (column doesn't exist in database)
        
        try:
            print(f"Updating user {user_id} with password data")
            result = supabase.table('users').update(update_data).eq('id', user_id).execute()
            print(f"Password update result: {result}")
            
            if result.data:
                print(f"Password successfully updated for user: {user.get('username', 'Unknown')}")
                return jsonify({
                    'success': True,
                    'message': 'Password reset successfully',
                    'user_id': user_id,
                    'username': user.get('username', 'Unknown')
                })
            else:
                print("No data returned from password update operation")
                return jsonify({
                    'success': False,
                    'error': 'Failed to reset password - no data returned'
                }), 500
        except Exception as update_error:
            print(f"Error during password update operation: {update_error}")
            return jsonify({
                'success': False,
                'error': f'Database update failed: {str(update_error)}'
            }), 500
            
    except Exception as e:
        print(f"Error resetting password: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to reset password: {str(e)}'
        }), 500

@app.route('/api/users/stats', methods=['GET'])
def get_user_stats():
    """Get user statistics for admin dashboard"""
    try:
        # Get all users
        all_users = supabase.table('users').select('role').execute()
        
        stats = {
            'total_users': len(all_users.data),
            'admins': len([u for u in all_users.data if u['role'] == 'admin']),
            'secretaries': len([u for u in all_users.data if u['role'] == 'secretary']),
            'priests': len([u for u in all_users.data if u['role'] == 'priest'])
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch user stats: {str(e)}'
        }), 500

# ============================================================================
# STIPENDIUM TRACKING API ENDPOINTS
# ============================================================================

@app.route('/api/stipendium/summary', methods=['GET'])
def get_stipendium_summary():
    """Get stipendium summary statistics"""
    try:
        # Get current month and year
        from datetime import datetime, timedelta
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        # Previous month for comparison
        prev_month = current_month - 1 if current_month > 1 else 12
        prev_year = current_year if current_month > 1 else current_year - 1
        
        # Query payments for current month
        current_month_query = supabase.table('payments').select('*').gte('created_at', f'{current_year}-{current_month:02d}-01').lt('created_at', f'{current_year}-{current_month+1:02d}-01' if current_month < 12 else f'{current_year+1}-01-01').execute()
        
        # Query payments for previous month
        prev_month_query = supabase.table('payments').select('*').gte('created_at', f'{prev_year}-{prev_month:02d}-01').lt('created_at', f'{prev_year}-{prev_month+1:02d}-01' if prev_month < 12 else f'{prev_year+1}-01-01').execute()
        
        current_payments = current_month_query.data
        prev_payments = prev_month_query.data
        
        # Calculate totals
        current_total = sum(float(p.get('amount_paid', 0)) for p in current_payments)
        prev_total = sum(float(p.get('amount_paid', 0)) for p in prev_payments)
        
        # Calculate growth
        growth = 0
        if prev_total > 0:
            growth = ((current_total - prev_total) / prev_total) * 100
        
        # Count paid reservations (fully paid and partial)
        paid_reservations = len([p for p in current_payments if p.get('payment_status') in ['Paid', 'Partial']])
        
        # Count pending payments
        pending_payments = len([p for p in current_payments if p.get('payment_status') == 'Pending'])
        
        # Calculate average payment
        average_payment = current_total / len(current_payments) if current_payments else 0
        
        return jsonify({
            'success': True,
            'data': {
                'total_stipendium': current_total,
                'stipendium_growth': round(growth, 1),
                'paid_reservations': paid_reservations,
                'pending_payments': pending_payments,
                'average_payment': round(average_payment, 2)
            }
        })
        
    except Exception as e:
        print(f"Error getting stipendium summary: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch stipendium summary: {str(e)}'
        }), 500

@app.route('/api/stipendium/payments', methods=['GET'])
def get_all_stipendium_payments():
    """Get all payment records with client and reservation details"""
    try:
        # Get all payments with reservation and client data
        payments_query = supabase.table('payments').select('*').execute()
        payments = payments_query.data
        
        # Get all reservations
        reservations_query = supabase.table('reservations').select('*').execute()
        reservations = {r['id']: r for r in reservations_query.data}
        
        # Get all clients
        clients_query = supabase.table('clients').select('*').execute()
        clients = {c['id']: c for c in clients_query.data}
        
        # Combine payment data with client and reservation info
        payment_records = []
        for payment in payments:
            reservation_id = payment.get('reservation_id')
            reservation = reservations.get(reservation_id, {})
            client_id = reservation.get('client_id')
            client = clients.get(client_id, {})
            
            payment_record = {
                'payment_id': payment.get('id'),
                'client_name': f"{client.get('first_name', '')} {client.get('last_name', '')}".strip(),
                'service_type': payment.get('service_type', ''),
                'amount_paid': float(payment.get('amount_paid', 0)),
                'amount_due': float(payment.get('amount_due', 0)),
                'payment_status': payment.get('payment_status', 'Pending'),
                'payment_method': payment.get('payment_method', ''),
                'payment_type': payment.get('payment_type', ''),
                'reservation_date': reservation.get('reservation_date', ''),
                'created_at': payment.get('created_at', ''),
                'gcash_reference': payment.get('gcash_reference', ''),
                'payment_notes': payment.get('payment_notes', '')
            }
            payment_records.append(payment_record)
        
        # Sort by creation date (newest first)
        payment_records.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': payment_records
        })
        
    except Exception as e:
        print(f"Error getting stipendium payments: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch payment records: {str(e)}'
        }), 500

@app.route('/api/stipendium/service-breakdown', methods=['GET'])
def get_stipendium_service_breakdown():
    """Get stipendium breakdown by service type"""
    try:
        # Get all payments
        payments_query = supabase.table('payments').select('*').execute()
        payments = payments_query.data
        
        # Calculate totals by service type
        service_totals = {
            'wedding': 0,
            'baptism': 0,
            'funeral': 0,
            'confirmation': 0
        }
        
        for payment in payments:
            service_type = payment.get('service_type', '').lower()
            amount_paid = float(payment.get('amount_paid', 0))
            
            if service_type in service_totals:
                service_totals[service_type] += amount_paid
        
        return jsonify({
            'success': True,
            'data': {
                'labels': ['Wedding', 'Baptism', 'Funeral', 'Confirmation'],
                'amounts': [
                    service_totals['wedding'],
                    service_totals['baptism'],
                    service_totals['funeral'],
                    service_totals['confirmation']
                ]
            }
        })
        
    except Exception as e:
        print(f"Error getting service breakdown: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch service breakdown: {str(e)}'
        }), 500

@app.route('/api/stipendium/collection-rate', methods=['GET'])
def get_collection_rate():
    """Calculate collection rate (paid vs total due)"""
    try:
        # Get all payments
        payments_query = supabase.table('payments').select('*').execute()
        payments = payments_query.data
        
        total_due = sum(float(p.get('amount_due', 0)) for p in payments)
        total_paid = sum(float(p.get('amount_paid', 0)) for p in payments)
        
        collection_rate = (total_paid / total_due * 100) if total_due > 0 else 0
        
        return jsonify({
            'success': True,
            'data': {
                'collection_rate': round(collection_rate, 1),
                'total_due': total_due,
                'total_paid': total_paid
            }
        })
        
    except Exception as e:
        print(f"Error calculating collection rate: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to calculate collection rate: {str(e)}'
        }), 500

# Admin Dashboard API Endpoints
@app.route('/api/admin/dashboard-stats', methods=['GET'])
def get_admin_dashboard_stats():
    """Get comprehensive admin dashboard statistics"""
    try:
        # Get total users (secretaries)
        users_query = supabase.table('users').select('*').eq('role', 'secretary').execute()
        total_secretaries = len(users_query.data)
        
        # Get total reservations
        reservations_query = supabase.table('reservations').select('*').execute()
        total_reservations = len(reservations_query.data)
        
        # Get pending reservations
        pending_reservations = len([r for r in reservations_query.data if r.get('status') == 'pending'])
        
        # Get approved reservations
        approved_reservations = len([r for r in reservations_query.data if r.get('status') in ['approved', 'confirmed']])
        
        # Get total revenue from payments
        payments_query = supabase.table('payments').select('amount_paid').execute()
        total_revenue = sum(float(p.get('amount_paid', 0)) for p in payments_query.data)
        
        # Get priests count
        priests_query = supabase.table('priests').select('*').execute()
        total_priests = len(priests_query.data)
        
        # Calculate monthly growth (current month vs previous month)
        from datetime import datetime, timedelta
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        current_month_reservations = len([r for r in reservations_query.data 
                                        if r.get('created_at') and 
                                        datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).month == current_month and
                                        datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).year == current_year])
        
        prev_month = current_month - 1 if current_month > 1 else 12
        prev_year = current_year if current_month > 1 else current_year - 1
        
        prev_month_reservations = len([r for r in reservations_query.data 
                                     if r.get('created_at') and 
                                     datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).month == prev_month and
                                     datetime.fromisoformat(r['created_at'].replace('Z', '+00:00')).year == prev_year])
        
        growth_rate = 0
        if prev_month_reservations > 0:
            growth_rate = ((current_month_reservations - prev_month_reservations) / prev_month_reservations) * 100
        
        return jsonify({
            'success': True,
            'data': {
                'total_reservations': total_reservations,
                'pending_reservations': pending_reservations,
                'approved_reservations': approved_reservations,
                'total_secretaries': total_secretaries,
                'total_priests': total_priests,
                'total_revenue': total_revenue,
                'monthly_growth': round(growth_rate, 1),
                'current_month_reservations': current_month_reservations,
                'prev_month_reservations': prev_month_reservations
            }
        })
        
    except Exception as e:
        print(f"Error getting admin dashboard stats: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch admin dashboard stats: {str(e)}'
        }), 500

@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    """Get all users for admin management - includes users and priests"""
    try:
        # Get users from users table
        users_query = supabase.table('users').select('*').execute()
        users = users_query.data
        
        # Get priests from priests table
        priests_query = supabase.table('priests').select('*').execute()
        priests = priests_query.data
        
        # Format user data for admin view
        formatted_users = []
        
        # Add regular users (admin, secretary)
        for user in users:
            formatted_users.append({
                'id': user.get('id'),
                'full_name': user.get('full_name'),
                'username': user.get('username'),
                'email': user.get('email'),
                'role': user.get('role'),
                'created_at': user.get('created_at'),
                'last_login': user.get('last_login'),
                'status': 'Active'
            })
        
        # Add priests as users with role 'priest'
        for priest in priests:
            # Construct full name from first_name and last_name
            first_name = priest.get('first_name', '')
            last_name = priest.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip() or 'Father'
            
            formatted_users.append({
                'id': priest.get('id'),
                'full_name': full_name,
                'username': priest.get('email'),  # Priests use email as username
                'email': priest.get('email'),
                'role': 'priest',
                'created_at': priest.get('created_at'),
                'last_login': None,  # Priests table doesn't have last_login
                'status': priest.get('status', 'active').title()
            })
        
        return jsonify({
            'success': True,
            'data': formatted_users
        })
        
    except Exception as e:
        print(f"Error getting admin users: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch users: {str(e)}'
        }), 500

@app.route('/api/admin/users', methods=['POST'])
def create_admin_user():
    """Create a new user (admin, secretary, or priest)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        full_name = data.get('full_name')
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role')
        status = data.get('status', 'active')
        
        # Validate required fields
        if not all([full_name, username, email, password, role]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        # Check if username or email already exists
        existing_user = supabase.table('users').select('*').eq('username', username).execute()
        if existing_user.data:
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        
        existing_email = supabase.table('users').select('*').eq('email', email).execute()
        if existing_email.data:
            return jsonify({'success': False, 'message': 'Email already exists'}), 400
        
        # Create user
        user_data = {
            'id': str(uuid.uuid4()),
            'full_name': full_name,
            'username': username,
            'email': email,
            'password_hash': generate_password_hash(password),
            'role': role,
            'created_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('users').insert(user_data).execute()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'data': result.data[0] if result.data else None
        })
        
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({'success': False, 'message': f'Failed to create user: {str(e)}'}), 500

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
def update_admin_user(user_id):
    """Update an existing user"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        
        # Build update data
        update_data = {}
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'username' in data:
            update_data['username'] = data['username']
        if 'email' in data:
            update_data['email'] = data['email']
        if 'role' in data:
            update_data['role'] = data['role']
        if 'status' in data:
            update_data['status'] = data['status']
        
        # Update user
        result = supabase.table('users').update(update_data).eq('id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'data': result.data[0] if result.data else None
        })
        
    except Exception as e:
        print(f"Error updating user: {e}")
        return jsonify({'success': False, 'message': f'Failed to update user: {str(e)}'}), 500

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
def delete_admin_user(user_id):
    """Delete a user"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Prevent deleting yourself
        if user_id == session.get('user_id'):
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        # Delete user
        result = supabase.table('users').delete().eq('id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({'success': False, 'message': f'Failed to delete user: {str(e)}'}), 500

@app.route('/api/admin/users/<user_id>/reset-password', methods=['POST'])
def admin_reset_user_password(user_id):
    """Reset user password (Admin only)"""
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({'success': False, 'message': 'New password is required'}), 400
        
        # Update password
        update_data = {
            'password_hash': generate_password_hash(new_password)
        }
        
        result = supabase.table('users').update(update_data).eq('id', user_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        })
        
    except Exception as e:
        print(f"Error resetting password: {e}")
        return jsonify({'success': False, 'message': f'Failed to reset password: {str(e)}'}), 500

@app.route('/api/priest/reservations', methods=['GET'])
def get_priest_reservations():
    """Get all reservations assigned to the logged-in priest"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    if session.get('role') != 'priest':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    try:
        priest_id = session.get('priest_id') or session.get('user_id')
        
        # Get all reservations assigned to this priest with status confirmed or approved ONLY
        reservations_query = supabase.table('reservations')\
            .select('*, clients(*)')\
            .eq('priest_id', priest_id)\
            .in_('status', ['confirmed', 'approved'])\
            .order('reservation_date', desc=False)\
            .execute()
        
        reservations = reservations_query.data
        
        # Format reservation data
        formatted_reservations = []
        for res in reservations:
            client = res.get('clients', {})
            
            # Try to get client name from multiple sources
            client_name = 'N/A'
            if client and client.get('full_name'):
                client_name = client.get('full_name')
            else:
                # Try to extract name from special_requests
                special_requests = res.get('special_requests', '')
                service_type = res.get('service_type', '').lower()
                
                import json
                import re
                
                # Extract JSON from special_requests
                match = re.search(r'\[SERVICE_DETAILS\](.*?)\[/SERVICE_DETAILS\]', special_requests)
                if match:
                    try:
                        details = json.loads(match.group(1))
                        # Get name based on service type
                        if service_type == 'wedding':
                            bride = details.get('bride_name', '')
                            groom = details.get('groom_name', '')
                            if bride and groom:
                                client_name = f"{bride} & {groom}"
                            elif bride:
                                client_name = bride
                            elif groom:
                                client_name = groom
                        elif service_type == 'baptism':
                            client_name = details.get('child_name', 'N/A')
                        elif service_type == 'funeral':
                            client_name = details.get('deceased_name', 'N/A')
                        elif service_type == 'confirmation':
                            client_name = details.get('confirmand_name', 'N/A')
                    except:
                        pass
            
            formatted_reservations.append({
                'id': res.get('id'),
                'reservation_id': res.get('reservation_id'),
                'service_type': res.get('service_type'),
                'reservation_date': res.get('reservation_date'),
                'reservation_time': res.get('reservation_time'),
                'status': res.get('status'),
                'client_name': client_name,
                'contact_number': client.get('contact_number', '') if client else '',
                'email': client.get('email', '') if client else '',
                'notes': res.get('notes', ''),
                'created_at': res.get('created_at')
            })
        
        return jsonify({
            'success': True,
            'reservations': formatted_reservations
        })
        
    except Exception as e:
        print(f"Error getting priest reservations: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Failed to fetch reservations: {str(e)}'
        }), 500

@app.route('/api/admin/recent-activity', methods=['GET'])
def get_admin_recent_activity():
    """Get recent system activity for admin dashboard"""
    try:
        # Get recent reservations
        reservations_query = supabase.table('reservations').select('*').order('created_at', desc=True).limit(10).execute()
        
        activities = []
        for reservation in reservations_query.data:
            activities.append({
                'type': 'reservation',
                'action': f"New {reservation.get('service_type', 'Unknown')} reservation created",
                'user': reservation.get('contact_name', 'Unknown'),
                'timestamp': reservation.get('created_at'),
                'status': reservation.get('status', 'pending')
            })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'] if x['timestamp'] else '', reverse=True)
        
        return jsonify({
            'success': True,
            'data': activities[:10]  # Return top 10 recent activities
        })
        
    except Exception as e:
        print(f"Error getting recent activity: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch recent activity: {str(e)}'
        }), 500

# ============================================
# OTP AND REGISTRATION SYSTEM
# ============================================

# Store OTPs temporarily (in production, use Redis or database)
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    import random
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

def send_otp_email(email, otp, full_name):
    """Send OTP verification email"""
    try:
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 700; }}
                .content {{ padding: 40px 30px; }}
                .otp-box {{ background: linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%); border: 2px dashed #0891b2; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }}
                .otp-code {{ font-size: 48px; font-weight: 700; color: #1e40af; letter-spacing: 12px; margin: 10px 0; }}
                .info-box {{ background: #f0f9ff; border-left: 4px solid #0891b2; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 13px; }}
                .btn {{ display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 ChurchEase Verification</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Email Verification Code</p>
                </div>
                <div class="content">
                    <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Hello <strong>{full_name}</strong>,</p>
                    <p style="font-size: 15px; color: #555; line-height: 1.6;">
                        Thank you for creating an account with ChurchEase! To complete your registration, please use the verification code below:
                    </p>
                    
                    <div class="otp-box">
                        <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 600;">YOUR VERIFICATION CODE</p>
                        <div class="otp-code">{otp}</div>
                        <p style="margin: 0; color: #64748b; font-size: 13px;">This code will expire in 10 minutes</p>
                    </div>
                    
                    <div class="info-box">
                        <p style="margin: 0; font-size: 13px; color: #0369a1; line-height: 1.6;">
                            <strong>⚠️ Security Notice:</strong><br>
                            • Never share this code with anyone<br>
                            • ChurchEase staff will never ask for your verification code<br>
                            • If you didn't request this code, please ignore this email
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #555; margin-top: 30px;">
                        If you have any questions, please contact our support team.
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;"><strong>ChurchEase</strong> - Church Management System</p>
                    <p style="margin: 10px 0 0 0;">© 2025 ChurchEase. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_body = f"""
        ChurchEase - Email Verification
        
        Hello {full_name},
        
        Your verification code is: {otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        © 2025 ChurchEase. All rights reserved.
        """
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'ChurchEase Verification Code: {otp}'
        msg['From'] = app.config['MAIL_USERNAME']
        msg['To'] = email
        
        msg.attach(MIMEText(plain_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        with smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT']) as server:
            server.starttls()
            server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
            server.send_message(msg)
        
        print(f"✅ OTP email sent to {email}")
        return True
    except Exception as e:
        print(f"❌ Error sending OTP email: {e}")
        traceback.print_exc()
        return False

@app.route('/api/check-name-and-send-otp', methods=['POST'])
def check_name_and_send_otp():
    """Check if name exists in database and send OTP to registered email"""
    try:
        data = request.json
        full_name = data.get('fullName', '').strip().upper()
        otp_type = data.get('type', 'registration')
        
        if not full_name:
            return jsonify({'success': False, 'message': 'Full name is required'}), 400
        
        print(f"🔍 Checking name in database: {full_name}")
        
        # Check in secretaries table
        secretary_result = supabase.table('secretaries').select('*').eq('full_name', full_name).execute()
        print(f"📊 Secretaries check: {len(secretary_result.data) if secretary_result.data else 0} results")
        
        # Check in admins table
        admin_result = supabase.table('admins').select('*').eq('full_name', full_name).execute()
        print(f"📊 Admins check: {len(admin_result.data) if admin_result.data else 0} results")
        
        # Check in priests table (priests use first_name + last_name, not full_name)
        # Get all priests and match by concatenating first_name and last_name
        priest_result = supabase.table('priests').select('*').execute()
        priest_match = None
        if priest_result.data:
            for priest in priest_result.data:
                # Concatenate first_name and last_name to match full_name
                priest_full_name = f"{priest.get('first_name', '')} {priest.get('last_name', '')}".strip().upper()
                if priest_full_name == full_name:
                    priest_match = priest
                    break
        print(f"📊 Priests check: {'Found match' if priest_match else 'No match'}")
        
        found_user = None
        found_email = None
        found_role = None
        found_table = None
        
        # Check which table has the user (Priority: secretaries > admins > priests)
        if secretary_result.data:
            found_user = secretary_result.data[0]
            found_email = found_user.get('email')
            found_role = 'secretary'
            found_table = 'secretaries'
            print(f"✅ Found in secretaries table: {found_email}")
        elif admin_result.data:
            found_user = admin_result.data[0]
            found_email = found_user.get('email')
            found_role = 'admin'
            found_table = 'admins'
            print(f"✅ Found in admins table: {found_email}")
        elif priest_match:
            found_user = priest_match
            found_email = priest_match.get('email')
            found_role = 'priest'
            found_table = 'priests'
            print(f"✅ Found in priests table: {found_email}")
        else:
            print(f"❌ Name not found in database: {full_name}")
            return jsonify({
                'success': False, 
                'message': 'Name not found in our database. Please contact the church administrator.'
            }), 404
        
        if not found_email:
            return jsonify({
                'success': False,
                'message': 'No email address registered for this name. Please contact the church administrator.'
            }), 404
        
        # For registration, check if user already has an account
        # For password reset, we WANT the user to exist
        if otp_type == 'registration':
            # Check if user already has an account in the users table
            existing_user_check = supabase.table('users').select('*').eq('full_name', full_name).execute()
            if existing_user_check.data:
                print(f"⚠️ User already has account in users table: {full_name}")
                return jsonify({
                    'success': False,
                    'message': 'Account already exists for this name. Please login or use "Forgot Password" if you need to reset your password.'
                }), 400
            
            # Also check if username exists in the staff table (secretaries/admins/priests)
            if found_user.get('username'):
                print(f"⚠️ User already has username in {found_table} table: {full_name}")
                return jsonify({
                    'success': False,
                    'message': 'Account already exists for this name. Please login or use "Forgot Password" if you need to reset your password.'
                }), 400
        elif otp_type == 'password_reset':
            # For password reset, verify user has an account
            # Check if user has username (meaning they have completed registration)
            if not found_user.get('username'):
                print(f"⚠️ User has not completed registration yet: {full_name}")
                return jsonify({
                    'success': False,
                    'message': 'No account found for this name. Please complete registration first.'
                }), 404
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with timestamp (expires in 10 minutes)
        from datetime import datetime, timedelta
        otp_storage[found_email.lower()] = {
            'otp': otp,
            'full_name': full_name,
            'email': found_email,
            'role': found_role,
            'table': found_table,  # Store which table the user is from
            'expires_at': datetime.now() + timedelta(minutes=10),
            'type': otp_type
        }
        
        # Send OTP email
        if send_otp_email(found_email, otp, full_name):
            print(f"✅ OTP sent to: {found_email}")
            return jsonify({
                'success': True,
                'message': 'Verification code sent to your registered email',
                'email': found_email  # Return email to display in modal
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send verification code. Please try again.'
            }), 500
            
    except Exception as e:
        print(f"❌ Error checking name and sending OTP: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email (legacy endpoint for forgot password)"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        full_name = data.get('fullName', '').strip()
        otp_type = data.get('type', 'registration')
        
        if not email or not full_name:
            return jsonify({'success': False, 'message': 'Email and name are required'}), 400
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with timestamp (expires in 10 minutes)
        from datetime import datetime, timedelta
        otp_storage[email] = {
            'otp': otp,
            'full_name': full_name,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'type': otp_type
        }
        
        # Send OTP email
        if send_otp_email(email, otp, full_name):
            return jsonify({
                'success': True,
                'message': 'Verification code sent to your email'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send verification code. Please try again.'
            }), 500
            
    except Exception as e:
        print(f"Error sending OTP: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP code"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()
        
        if not email or not otp:
            return jsonify({'success': False, 'message': 'Email and OTP are required'}), 400
        
        # Check if OTP exists
        if email not in otp_storage:
            return jsonify({'success': False, 'message': 'Invalid or expired verification code'}), 400
        
        stored_data = otp_storage[email]
        
        # Check if OTP expired
        from datetime import datetime
        if datetime.now() > stored_data['expires_at']:
            del otp_storage[email]
            return jsonify({'success': False, 'message': 'Verification code has expired'}), 400
        
        # Verify OTP
        if stored_data['otp'] != otp:
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
        
        # OTP verified successfully
        return jsonify({
            'success': True,
            'message': 'Email verified successfully'
        })
        
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/complete-registration', methods=['POST'])
def complete_registration():
    """Complete user registration after OTP verification"""
    try:
        data = request.json
        full_name = data.get('fullName', '').strip().upper()
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip().lower()
        password = data.get('password', '')
        
        if not all([full_name, email, username, password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        # Verify email was verified via OTP
        if email not in otp_storage:
            return jsonify({'success': False, 'message': 'Email not verified'}), 400
        
        otp_data = otp_storage[email]
        role = otp_data.get('role', 'secretary')
        table_name = otp_data.get('table', 'secretaries')
        
        # Check if username already exists in users table
        users_check = supabase.table('users').select('username').eq('username', username).execute()
        if users_check.data:
            return jsonify({'success': False, 'message': 'Username already taken'}), 400
        
        # Check if username already exists in staff tables
        secretary_check = supabase.table('secretaries').select('username').eq('username', username).execute()
        admin_check = supabase.table('admins').select('username').eq('username', username).execute()
        priest_check = supabase.table('priests').select('username').eq('username', username).execute()
        
        if secretary_check.data or admin_check.data or priest_check.data:
            return jsonify({'success': False, 'message': 'Username already taken'}), 400
        
        # Generate password hash
        password_hash = generate_password_hash(password)
        
        # Create account in users table
        import uuid
        user_data = {
            'id': str(uuid.uuid4()),
            'username': username,
            'full_name': full_name,
            'email': email,
            'password_hash': password_hash,
            'role': role,
            'status': 'active',
            'created_at': datetime.utcnow().isoformat()
        }
        
        insert_result = supabase.table('users').insert(user_data).execute()
        
        if insert_result.data:
            # Also update the staff table to mark as registered
            supabase.table(table_name).update({
                'username': username,
                'password_hash': password_hash,
                'email_verified': True,
                'status': 'active',
                'updated_at': datetime.utcnow().isoformat()
            }).eq('full_name', full_name).eq('email', email).execute()
            
            # Clear OTP storage
            del otp_storage[email]
            
            print(f"✅ Account created in users table: {full_name} ({username}) - Role: {role}")
            
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'user': {
                    'username': username,
                    'full_name': full_name,
                    'email': email,
                    'role': role
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to create account. User record not found.'}), 500
            
    except Exception as e:
        print(f"❌ Error completing registration: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/send-reset-code', methods=['POST'])
def send_reset_code():
    """Send password reset code to user's email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400
        
        # Check if email exists
        user = supabase.table('users').select('*').eq('email', email).execute()
        if not user.data:
            return jsonify({'success': False, 'message': 'Email not found in our system'}), 404
        
        user_data = user.data[0]
        full_name = user_data.get('full_name', 'User')
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP
        from datetime import datetime, timedelta
        otp_storage[email] = {
            'otp': otp,
            'full_name': full_name,
            'expires_at': datetime.now() + timedelta(minutes=10),
            'type': 'password_reset',
            'user_id': user_data.get('id')
        }
        
        # Send OTP email
        if send_otp_email(email, otp, full_name):
            return jsonify({
                'success': True,
                'message': 'Password reset code sent to your email'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send reset code. Please try again.'
            }), 500
            
    except Exception as e:
        print(f"Error sending reset code: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    """Reset user password after OTP verification"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        new_password = data.get('newPassword', '')
        
        if not email or not new_password:
            return jsonify({'success': False, 'message': 'Email and new password are required'}), 400
        
        # Verify email was verified via OTP
        if email not in otp_storage:
            return jsonify({'success': False, 'message': 'Email not verified. Please request a new reset code.'}), 400
        
        otp_data = otp_storage[email]
        
        # Verify this is a password reset OTP
        if otp_data.get('type') != 'password_reset':
            return jsonify({'success': False, 'message': 'Invalid reset request'}), 400
        
        full_name = otp_data.get('full_name')
        role = otp_data.get('role')
        table_name = otp_data.get('table')
        
        if not all([full_name, role, table_name]):
            return jsonify({'success': False, 'message': 'Invalid reset data'}), 400
        
        # Generate new password hash
        password_hash = generate_password_hash(new_password)
        
        print(f"🔄 Resetting password for: {full_name} ({email}) in {table_name} table")
        
        # Update password in the staff table (secretaries/admins/priests)
        update_result = supabase.table(table_name).update({
            'password_hash': password_hash,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('email', email).execute()
        
        if update_result.data:
            # Also update in users table if exists
            users_result = supabase.table('users').select('*').eq('email', email).execute()
            if users_result.data:
                supabase.table('users').update({
                    'password_hash': password_hash,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('email', email).execute()
                print(f"✅ Password updated in users table")
            
            # Clear OTP storage
            del otp_storage[email]
            
            print(f"✅ Password reset successfully for: {full_name}")
            
            return jsonify({
                'success': True,
                'message': 'Password reset successfully'
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to reset password. Please try again.'}), 500
            
    except Exception as e:
        print(f"❌ Error resetting password: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# Initialize admin user on startup
init_admin_user()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
