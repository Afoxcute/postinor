use crate::{Balances, Runtime, RuntimeEvent};
use frame_support::traits::ConstU32;
use pallet_ip_pallet::pallet::Config; 

impl Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type OfferId = u32;
    type ContractId = u32;
    type NFTId = u32;
    type Index = u32;
    type MaxNameLength = ConstU32<50>;
    type MaxDescriptionLength = ConstU32<200>;
}