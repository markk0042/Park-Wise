// pages/privacy.tsx
export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1>Privacy Policy – Parking Management System</h1>
      <p><strong>Last updated:</strong> 26 November 2025</p>

      <p>
        This app (“Parking Management System”) is operated by [Your Organisation Name]
        (“we”, “us”). It is a companion to our Park Wise web platform and is used by
        authorised staff to manage parking activity.
      </p>

      <h2>1. What data we collect</h2>
      <ul>
        <li>Account data: email address, name, role, profile status.</li>
        <li>Parking logs: registration plates, permit numbers, parking type, dates/times, notes.</li>
        <li>Vehicles: registration plates, owner/driver names, permit info, notes.</li>
        <li>Complaints: subject, description, location, status, photo evidence.</li>
        <li>Technical data: device type, OS, IP address, basic diagnostics.</li>
      </ul>

      <h2>2. How we use your data</h2>
      <p>
        We use this data to log and manage parking, provide dashboards, capture and
        resolve complaints, maintain security, and comply with our legal obligations.
        The app is intended for authorised staff only.
      </p>

      <h2>3. Storage and processors</h2>
      <p>
        We use Supabase to provide authentication, databases, and file storage.
        Supabase acts as a data processor on our behalf and data is protected by
        appropriate technical and organisational measures.
      </p>

      <h2>4. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, or
        delete your data, object to certain processing, or lodge a complaint with a
        data protection authority.
      </p>

      <h2>5. Contact</h2>
      <p>
        For any questions about this policy or how we handle data, please contact:
        <br />
        Email: [your-contact-email]
        <br />
        Organisation: [Your Organisation Name]
      </p>
    </main>
  );
}
