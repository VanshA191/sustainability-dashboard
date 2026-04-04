import ssl
import http.server
import datetime
import os
import sys
import ipaddress

try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
except ImportError:
    print("Cryptography module not found. Run: pip install cryptography")
    sys.exit(1)

def generate_self_signed_cert():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"10.183.92.171"),
    ])
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(u"localhost"), 
            x509.IPAddress(ipaddress.ip_address(u"10.183.92.171"))
        ]),
        critical=False,
    ).sign(key, hashes.SHA256())
    
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    with open("key.pem", "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    print("Successfully generated self-signed root cert.pem and key.pem")

def start_https():
    server_address = ('0.0.0.0', 8000)
    httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile="../cert.pem", keyfile="../key.pem")
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    print("Serving securely on local LAN: https://10.183.92.171:8000")
    print("NOTE: Browsers WILL show a 'Not Secure' warning! Click 'Advanced' -> 'Proceed' to view.")
    httpd.serve_forever()

if __name__ == '__main__':
    generate_self_signed_cert()
    os.chdir('public')
    start_https()
