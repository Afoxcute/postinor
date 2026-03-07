import { Card, CardContent } from "@/components/ui/card";
import { Home, Book, Cog, Users, BarChart, Inbox } from "lucide-react";
import Link from "next/link";

const bentoItems = [
  {
    title: "Available Offers",
    icon: Home,
    href: "/extrinsics/available-offers",
    color: "bg-blue-500",
    disabled: false,
  },
  {
    title: "Accept Purchase",
    icon: Book,
    href: "/extrinsics/accept-purchase",
    color: "bg-green-500",
    disabled: true,
  },
  {
    title: "Complete Purchase",
    icon: Cog,
    href: "/extrinsics/complete-purchase",
    color: "bg-purple-500",
    disabled: true,
  },
  {
    title: "Expire License",
    icon: Users,
    href: "/extrinsics/expire-license",
    color: "bg-yellow-500",
    disabled: true,
  },
  {
    title: "Make Periodic Payment",
    icon: BarChart,
    href: "/extrinsics/make-periodic-payment",
    color: "bg-red-500",
    disabled: true,
  },
  {
    title: "Offer Purchase",
    icon: Inbox,
    href: "/extrinsics/offer-purchase",
    color: "bg-indigo-500",
    disabled: true,
  },
];

export default function BentoLinks() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Quick Links</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bentoItems.map((item) => (
          <div key={item.title}>
            {item.disabled ? (
              <Card className="opacity-50 cursor-not-allowed">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${item.color}`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Link href={item.href}>
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6 flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${item.color}`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                      <p className="text-sm text-gray-500">Click to view</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
