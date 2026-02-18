// import Image from "next/image";
// import Link from "next/link";
// import logoImage from "./assets/logo.png";

// export function Logo({ isCollapsed = false, isAdmin = false, link = "/" }: { isCollapsed?: boolean, isAdmin?: boolean, link?: string }) {
//  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
//   return (
//     <Link href={webUrl || link} className="flex items-center">
//       <Image
//         src={logoImage}
//         alt="Ordafy Logo"
//         width={80}
//         height={60}
//         className="h-20 w-20 rounded-lg object-contain"
//         priority
//       />
//       {/* {!isCollapsed && !isAdmin && <span className="text-2xl font-bold">Ordafy</span>}
//       {!isCollapsed && isAdmin && <span className="text-2xl font-bold">Ordafy Admin</span>} */}
//     </Link>
//   )
// }

import Image from "next/image";
import Link from "next/link";
import logoImage from "./assets/logo.png";
import iconImage from "./assets/icon.png";

export function Logo({ isCollapsed = false, isAdmin = false, link = "/" }: { isCollapsed?: boolean, isAdmin?: boolean, link?: string }) {
 const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  return (
    <Link href={webUrl || link} className="flex items-center">
     {isCollapsed ? (
      <Image
        src={iconImage}
        alt="Ordafy Icon"
        width={24}
        height={24}
        className="h-10 w-10 rounded-lg"
        priority
      />
    ) : (
      <Image
        src={logoImage}
          alt="Ordafy Logo"
          width={96}
          height={16}
          className="h-8 w-36 rounded-lg"
          priority
        />
      )}
    </Link>
  )
}