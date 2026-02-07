import { Items } from "./Items";
import { Cart } from "./Cart";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { reatomComponent } from "@reatom/react";
import { client } from "./convex-client";

const Home = reatomComponent(function Home() {
  const isAuthenticated = client.isAuthenticated();

  return (
    <div className="container px-8 py-12 max-w-screen-lg">
      <Header />
      <div className="flex flex-col sm:flex-row">
        <div className="basis-2/5 mb-6 sm:mb-0 sm:order-2">
          {isAuthenticated && (
            <Cart />
          )}
        </div>
        <div className="basis-3/5 sm:order-1">
          <Items />
        </div>
      </div>
      <Footer />
    </div>
  );
})

export default Home;