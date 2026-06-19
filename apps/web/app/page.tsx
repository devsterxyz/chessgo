import Image from "next/image";
import Link from "next/link";
import { Button } from "@repo/ui/Button";


export default function Home() {

  return (
    <div className='flex justify-center'>
      <div className='pt-8 max-w-screen-lg'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='flex justify-center'>
            <img src={"/chessBoard.png"} className='max-w-96' />
          </div>
          <div className='pt-16'>
            <div className='flex justify-center'>
              <h1 className='text-4xl font-bold mb-4 text-white'>Play Chess Online on ChessGo</h1>
            </div>
            <div className='mt-8 flex justify-center'>
              <Link href='/play'>
                <Button>
                  Play
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
